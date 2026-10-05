import time
import random
import traceback
from datetime import datetime, timedelta, timezone
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, text
import undetected_chromedriver as uc
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from urllib.parse import urljoin
from dotenv import load_dotenv
import os

# ==========================================
# НАСТРОЙКИ
# ==========================================
load_dotenv()  # загрузит .env из текущей папки
DATABASE_URL = os.getenv("DATABASE_URL")
BASE_URL = "https://www.hltv.org"
MY_CHROME_VERSION = 151 

engine = create_engine(DATABASE_URL)

def get_driver():
    options = uc.ChromeOptions()
    options.page_load_strategy = 'eager'
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--disable-images')
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/116.0.0.0')
    try:
        driver = uc.Chrome(options=options, version_main=MY_CHROME_VERSION)
    except:
        driver = uc.Chrome(options=options)
    driver.set_page_load_timeout(30)
    return driver

def smart_get(driver, url, wait_selector):
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, wait_selector))
        )
        time.sleep(2) 
    except:
        pass
    finally:
        driver.execute_script("window.stop();")

# ==========================================
# ПАРСИНГ ВНУТРЕННЕЙ СТРАНИЦЫ
# ==========================================
def parse_match_inner_page(driver, info, is_upcoming=False):
    # Если матч LIVE или Завершен, ждем контент страницы
    wait_sel = '.lineups' if is_upcoming else '.match-page'
    smart_get(driver, info['link'], wait_sel)
    
    # Даем JS время прогрузить стримы и таблицы
    time.sleep(2) 
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    
    # 📅 ВРЕМЯ
    date_el = soup.select_one('div.date[data-unix]')
    if date_el and date_el.get('data-unix'):
        ts = int(date_el.get('data-unix')) / 1000
        info['date'] = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
    else:
        info['date'] = datetime.now(timezone.utc).replace(tzinfo=None)

    # 📺 ПОИСК ТРАНСЛЯЦИИ (Улучшенный)
    info['stream_url'] = None
    stream_boxes = soup.select('.streams .stream-box')
    ru_streams, en_streams, other_streams = [], [], []

    for box in stream_boxes:
        link_tag = box.select_one('.external-stream a')
        if not link_tag: continue
        href = link_tag.get('href')
        flag_img = box.select_one('img.stream-flag')
        lang = flag_img.get('title', '').lower() if flag_img else ""
        
        if 'russia' in lang or 'ru' in lang:
            ru_streams.append(href)
        elif 'united kingdom' in lang or 'english' in lang or 'en' in lang:
            en_streams.append(href)
        else:
            other_streams.append(href)

    all_streams = ru_streams + en_streams + other_streams
    if all_streams:
        info['stream_url'] = all_streams[0]
        print(f"   [DEBUG] Найден стрим: {info['stream_url']}")

    # 🗺️ КАРТЫ
    info['maps'] = []
    for mh in soup.select('.mapholder'):
        name = mh.select_one('.mapname')
        scores = mh.select('.results-team-score')
        if name and len(scores) >= 2:
            info['maps'].append({
                'name': name.text.strip(),
                's1': int(scores[0].text) if scores[0].text.isdigit() else 0,
                's2': int(scores[1].text) if scores[1].text.isdigit() else 0
            })

    # 👥 ИГРОКИ
    info['players'] = []
    
    # Пробуем найти таблицу статистики (для Live/Finished)
    stats_tables = soup.select("#all-content > table.totalstats")
    
    # Если таблиц НЕТ (или это upcoming), но есть блоки составов (.lineup)
    if is_upcoming or not stats_tables:
        if not is_upcoming:
            print(f"   [DEBUG] Статистика еще не появилась, парсим составы (lineups) для {info['link']}")
            
        lineup_blocks = soup.select('div.lineup')
        for block in lineup_blocks:
            team_anchor = block.select_one('.box-headline a.text-ellipsis')
            team_name = team_anchor.text.strip() if team_anchor else "Unknown"
            
            player_elements = block.select('td.player div.text-ellipsis')
            for p_el in player_elements:
                nick = p_el.text.strip()
                is_s = 'standin' in str(p_el.parent.get('class', []))
                
                info['players'].append({
                    'team': team_name,
                    'name': nick,
                    'is_standin': is_s,
                    'k': 0, 'd': 0, 'adr': 0.0, 'kast': 0.0, 'rating': 0.0
                })
    else:
        # Если таблицы статистики ЕСТЬ (матч идет или завершен)
        for table in stats_tables:
            team_name_tag = table.select_one('a.teamName')
            team_name = team_name_tag.text.strip() if team_name_tag else "Unknown"
            
            for row in table.select('tr'):
                if 'header-row' in row.get('class', []) or not row.select('.players'): 
                    continue
                
                nick_tag = row.select_one('.player-nick') or row.select_one('.players a')
                if not nick_tag: continue
                
                kd_el = row.select_one('.kd')
                kd_vals = kd_el.text.split('-') if kd_el else [0, 0]
                
                info['players'].append({
                    'team': team_name,
                    'name': nick_tag.text.strip(),
                    'is_standin': False,
                    'k': int(kd_vals[0]) if len(kd_vals) > 0 else 0, 
                    'd': int(kd_vals[1]) if len(kd_vals) > 1 else 0,
                    'adr': float(row.select_one('.adr').text) if row.select_one('.adr') else 0.0,
                    'kast': float(row.select_one('.kast').text.replace('%','')) if row.select_one('.kast') else 0.0,
                    'rating': float(row.select_one('.rating').text) if row.select_one('.rating') else 0.0
                })
    
    print(f"   [DEBUG] Собрано для {info['link']}: {len(info['players'])} игроков.")
    return info

# ==========================================
# СОХРАНЕНИЕ В БД
# ==========================================
def save_to_db(data, status='finished'):
    try:
        with engine.begin() as conn:
            # 1. Команды
            for t in [data['team1'], data['team2']]:
                conn.execute(text("INSERT INTO teams (name) VALUES (:n) ON CONFLICT (name) DO NOTHING"), {"n": t})
            
            t1_id = conn.execute(text("SELECT team_id FROM teams WHERE name = :n"), {"n": data['team1']}).scalar()
            t2_id = conn.execute(text("SELECT team_id FROM teams WHERE name = :n"), {"n": data['team2']}).scalar()

            # 2. Победитель
            winner_id = None
            if status == 'finished':
                if data['s1'] > data['s2']: winner_id = t1_id
                elif data['s2'] > data['s1']: winner_id = t2_id

            # 3. Матч
            res = conn.execute(text("""
                INSERT INTO matches (hltv_match_id, match_date, tournament, format, team1_id, team2_id, score_team1, score_team2, status, winner_team_id, stream_url)
                VALUES (:hid, :dt, :tr, :fmt, :t1, :t2, :s1, :s2, :st, :win, :stream)
                ON CONFLICT (hltv_match_id) DO UPDATE SET 
                    match_date = EXCLUDED.match_date, status = EXCLUDED.status,
                    score_team1 = EXCLUDED.score_team1, score_team2 = EXCLUDED.score_team2,
                    winner_team_id = EXCLUDED.winner_team_id,
                    stream_url = COALESCE(EXCLUDED.stream_url, matches.stream_url)
                RETURNING match_id
            """), {
                'hid': data['link'], 'dt': data.get('date'), 'tr': data['tournament'], 'fmt': data['format'],
                't1': t1_id, 't2': t2_id, 's1': data.get('s1', 0), 's2': data.get('s2', 0), 'st': status, 'win': winner_id,
                'stream': data.get('stream_url') # <--- Это передает ссылку
            })
            
            mid = res.scalar()
            if not mid: return

            # 4. Игроки
            if 'players' in data and data['players']:
                conn.execute(text("DELETE FROM player_match_stats WHERE match_id = :mid"), {'mid': mid})
                for p in data['players']:
                    conn.execute(text("INSERT INTO players (name) VALUES (:n) ON CONFLICT (name) DO NOTHING"), {'n': p['name']})
                    pid = conn.execute(text("SELECT player_id FROM players WHERE name = :n"), {'n': p['name']}).scalar()
                    
                    # Прямая привязка к team_id через сравнение имен
                    curr_tid = t2_id if p['team'].lower() == data['team2'].lower() else t1_id
                    
                    conn.execute(text("""
                        INSERT INTO player_match_stats (match_id, player_id, team_id, kills, deaths, adr, kast, rating, is_standin)
                        VALUES (:mid, :pid, :tid, :k, :d, :adr, :kast, :r, :is_s)
                    """), {
                        'mid': mid, 'pid': pid, 'tid': curr_tid, 'k': p['k'], 'd': p['d'], 
                        'adr': p['adr'], 'kast': p['kast'], 'r': p['rating'], 'is_s': p.get('is_standin', False)
                    })

            # 5. Карты
            if status == 'finished' and 'maps' in data:
                conn.execute(text("DELETE FROM match_maps WHERE match_id = :mid"), {'mid': mid})
                for m in data['maps']:
                    conn.execute(text("INSERT INTO match_maps (match_id, map_name, team1_score, team2_score) VALUES (:mid, :n, :s1, :s2)"), 
                                 {'mid': mid, 'n': m['name'], 's1': m['s1'], 's2': m['s2']})
            print(f"   ✅ БД ОБНОВЛЕНА: {data['team1']} vs {data['team2']}")
    except Exception as e:
        print(f"   ❌ Ошибка БД: {traceback.format_exc()}")

# ==========================================
# ФАЗЫ ЦИКЛА
# ==========================================

def sync_live_matches(driver):
    print("\n--- [ФАЗА 4] Проверка Live матчей ---")
    driver.get(f"{BASE_URL}/matches")
    time.sleep(3)
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    
    live_section = soup.select_one('.liveMatches')
    if not live_section:
        print("   [DEBUG] Live-матчей сейчас нет.")
        return

    # Берем каждый матч
    for wrapper in live_section.select('.live-match-container'):
        link_el = wrapper.select_one('a.match-teams')
        if not link_el: continue
        match_url = urljoin(BASE_URL, link_el.get('href'))
        
        teams = wrapper.select('.match-teamname')
        if len(teams) < 2: continue
        
        t1, t2 = teams[0].text.strip(), teams[1].text.strip()
        
        # ТУРНИР (Исправлено: берем из .match-event)
        event_el = wrapper.select_one('.match-event .text-ellipsis')
        tournament = event_el.text.strip() if event_el else "Live Match"
        
        print(f" 📡 Анализ Live: {t1} vs {t2} | {tournament}")
        
        info = {
            'link': match_url, 'team1': t1, 'team2': t2,
            's1': 0, 's2': 0, 'tournament': tournament, 'format': 'BO3'
        }
        
        # Передаем info в парсер - он внутри заберет stream_url
        full_data = parse_match_inner_page(driver, info, is_upcoming=False)
        save_to_db(full_data, status='live')


def sync_history(driver):
    print("\n--- [ФАЗА 1] Синхронизация истории ---")
    driver.get(f"{BASE_URL}/results")
    time.sleep(5)
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    if soup.select_one('.big-results'): soup.select_one('.big-results').decompose()

    with engine.connect() as conn:
        latest_id = conn.execute(text("SELECT hltv_match_id FROM matches WHERE status = 'finished' ORDER BY match_date DESC LIMIT 1")).scalar()

    result_con_list = soup.select('.results-sublist .result-con')
    for con in result_con_list:
        link_el = con.select_one('a.a-reset')
        if not link_el: continue
        match_url = urljoin(BASE_URL, link_el.get('href'))
        if match_url == latest_id: break

        t1_n = con.find('div', class_='team1').text.strip()
        t2_n = con.find('div', class_='team2').text.strip()
        score_tag = con.find('td', class_='result-score')
        s1, s2 = 0, 0
        if score_tag and " - " in score_tag.text:
            parts = score_tag.text.strip().split(' - ')
            s1, s2 = int(parts[0]), int(parts[1])

        info = {
            'link': match_url, 'team1': t1_n, 'team2': t2_n, 's1': s1, 's2': s2,
            'tournament': con.find('span', class_='event-name').text.strip() if con.find('span', class_='event-name') else "N/A",
            'format': con.find('div', class_='map-text').text.strip() if con.find('div', class_='map-text') else "bo3"
        }
        print(f" 📥 Обработка: {t1_n} vs {t2_n}")
        full_data = parse_match_inner_page(driver, info)
        save_to_db(full_data, status='finished')
        time.sleep(random.uniform(2, 4))

def sync_upcoming(driver):
    print("\n--- [ФАЗА 2] Расписание на 7 дней ---")
    for day in range(7):
        date_str = (datetime.now(timezone.utc) + timedelta(days=day)).strftime('%Y-%m-%d')
        target_url = f"{BASE_URL}/matches?selectedDate={date_str}"
        print(f" 📅 Дата: {date_str}")
        smart_get(driver, target_url, 'div[data-upcoming-matches]')
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        main_list = soup.select_one('div[data-upcoming-matches]')
        if not main_list: continue

        for wrapper in main_list.select('.match-wrapper'):
            link_el = wrapper.select_one('a.match-info')
            t1_el = wrapper.select_one('.team1 .match-teamname')
            t2_el = wrapper.select_one('.team2 .match-teamname')
            if not link_el or not t1_el or not t2_el: continue
            
            t1, t2 = t1_el.text.strip(), t2_el.text.strip()
            if any(x in t1.upper() for x in ["TBD", "WINNER"]): continue

            match_url = urljoin(BASE_URL, link_el.get('href'))
            unix_ms = wrapper.select_one('.match-time').get('data-unix')
            event_wrap = wrapper.find_parent('div', class_='matches-event-wrapper')
            
            info = {
                'link': match_url, 'team1': t1, 'team2': t2, 's1': 0, 's2': 0,
                'tournament': event_wrap.select_one('.event-headline-text').text.strip() if event_wrap else "N/A",
                'format': wrapper.select_one('.match-meta').text.strip(),
                'status': 'upcoming'
            }
            full_data = parse_match_inner_page(driver, info, is_upcoming=True)
            save_to_db(full_data, status='upcoming')

def update_pending_results(driver):
    print("\n--- [ФАЗА 3] Проверка результатов ---")
    with engine.connect() as conn:
        # Берем матчи, начавшиеся более 2 часов назад
        query = text("SELECT hltv_match_id, tournament, format FROM matches WHERE status IN ('upcoming', 'live') AND match_date < :t")
        pending = conn.execute(query, {"t": datetime.now(timezone.utc) - timedelta(hours=2)}).fetchall()

    print(f"   [DEBUG] Найдено {len(pending)} матчей для проверки.")

    for row in pending:
        url = row[0]
        print(f" 🔄 Проверка: {url}")
        
        # Ждем появления основного контейнера матча
        smart_get(driver, url, '.match-page')
        # В ФАЗЕ 3 даем чуть больше времени JS-скриптам прогрузить счет
        time.sleep(3) 
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 1. Проверяем, завершен ли матч
        countdown = soup.select_one('.countdown')
        if not (countdown and "Match over" in countdown.text):
            print("   ⏳ Матч еще идет...")
            continue

        print("   ✅ Матч завершен! Собираем данные...")

        # 2. Собираем НАЗВАНИЯ КОМАНД (из шапки, чтобы не собрать 30 штук)
        t1_name_el = soup.select_one('.team1-gradient .teamName')
        t2_name_el = soup.select_one('.team2-gradient .teamName')
        
        if not t1_name_el or not t2_name_el:
            # Попытка №2 для названий
            t1_name_el = soup.select_one('.team-left .teamName')
            t2_name_el = soup.select_one('.team-right .teamName')

        # 3. Собираем СЧЕТ (с защитой от 0:0)
        s1_el = soup.select_one('.team1-gradient .score')
        s2_el = soup.select_one('.team2-gradient .score')
        
        s1 = int(s1_el.text.strip()) if s1_el and s1_el.text.strip().isdigit() else 0
        s2 = int(s2_el.text.strip()) if s2_el and s2_el.text.strip().isdigit() else 0

        # ЧИТ-КОД: Если в шапке 0:0, считаем выигранные карты в блоке карт
        if s1 == 0 and s2 == 0:
            print("   [!] Счет в шапке 0:0, считаем по картам...")
            map_holders = soup.select('.mapholder')
            for mh in map_holders:
                results = mh.select('.results-team-score')
                if len(results) >= 2:
                    ms1 = int(results[0].text.strip()) if results[0].text.strip().isdigit() else 0
                    ms2 = int(results[1].text.strip()) if results[1].text.strip().isdigit() else 0
                    if ms1 > ms2: s1 += 1
                    elif ms2 > ms1: s2 += 1
            print(f"   [DEBUG] Пересчитанный счет по картам: {s1}:{s2}")

        if t1_name_el and t2_name_el:
            t1 = t1_name_el.text.strip()
            t2 = t2_name_el.text.strip()
            
            info = {
                'link': url, 's1': s1, 's2': s2, 
                'team1': t1, 'team2': t2, 
                'tournament': row[1], 'format': row[2]
            }
            
            # Собираем глубокую статистику (10 игроков и т.д.)
            full_data = parse_match_inner_page(driver, info, is_upcoming=False)
            
            if full_data:
                save_to_db(full_data, status='finished')
                print(f"   🚀 Статус обновлен: {t1} vs {t2} ({s1}:{s2})")
        else:
            print(f"   [!] Критическая ошибка: Не удалось найти названия команд на {url}")

if __name__ == "__main__":
    driver = get_driver()
    
    # Настройки таймингов (в секундах)
    LIVE_INTERVAL = 300      # 5 минут для Live-матчей
    FULL_SYNC_INTERVAL = 1800 # 30 минут для истории и расписания
    
    # Переменная для хранения времени последнего запуска тяжелых задач
    last_full_sync = 0
    
    try:
        while True:
            current_time = time.time()
            
            print(f"\nПоток: {datetime.now().strftime('%H:%M:%S')}")
            
            # 1. LIVE-МАТЧИ
            try:
                sync_live_matches(driver)
            except Exception as e:
                print(f"Ошибка в sync_live_matches: {e}")

            # 2. ТЯЖЕЛЫЕ ЗАДАЧИ
            if current_time - last_full_sync > FULL_SYNC_INTERVAL:
                print(f"\n🕒 Запуск плановой синхронизации (Раз в 30 мин)...")
                try:
                    update_pending_results(driver)
                    
                    sync_upcoming(driver)
                    
                    sync_history(driver)
                    
                    last_full_sync = time.time()
                except Exception as e:
                    print(f"Ошибка в тяжелых задачах: {e}")
                    traceback.print_exc()

            print(f"\n⏳ Мониторинг активен. Следующая проверка Live через 5 мин...")
            time.sleep(LIVE_INTERVAL)
            
    finally:
        driver.quit()