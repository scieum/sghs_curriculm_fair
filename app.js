/* ===================================================================
   속초여고 교육과정 박람회 — 앱 로직
   =================================================================== */
(function () {
  "use strict";

  var KEY = {
    grade: "scwgo_grade_v1",
    name:  "scwgo_nick_v1",
    hak:   "scwgo_stu_v1",
    holland: "scwgo_holland_v1"
  };

  // 박람회 당일 (D-day 기준) — TODO: 실제 박람회 날짜로 변경
  var EVENT_DATE = "2026-09-01";

  // 교사용 페이지 접속 코드 — TODO: 실제 코드로 변경 (필요하면 이 값만 바꾸면 됩니다)
  var TEACHER_CODE = "0000";

  // 현재 사용자가 교사 모드인지
  function isTeacher() { return (localStorage.getItem(KEY.grade) || "") === "T"; }
  // 화면에 보여줄 학년 목록 (학생=본인 학년만 / 교사=1·2학년 모두)
  function viewGrades() {
    if (isTeacher()) return ["1", "2"];
    var g = localStorage.getItem(KEY.grade) || "";
    return (g === "1" || g === "2") ? [g] : ["1", "2"];
  }
  // 이름 뒤 호칭: 교사="선생님", 학생="학생" (게스트는 없음)
  function honorific(name) {
    if (!name || name === "게스트") return "";
    return isTeacher() ? " 선생님" : " 학생";
  }

  // 캐릭터(자홍이) 풀
  var CHARS = ["img/char-avatar1.png","img/char-avatar2.png","img/char-avatar3.png","img/char-avatar4.png","img/char-avatar5.png"];

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 1) 기기 판별 ---------- */
  function detectDevice() {
    var ua = navigator.userAgent || "";
    var isMobileUA = /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(ua);
    var isTablet   = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var narrow     = window.matchMedia("(max-width: 768px)").matches;
    var coarse     = window.matchMedia("(pointer: coarse)").matches;
    var isMobile   = isMobileUA || isTablet || (narrow && coarse);

    var dev = $("device");
    dev.classList.toggle("is-pc", !isMobile);
    dev.classList.toggle("is-mobile", isMobile);
    document.documentElement.dataset.device = isMobile ? "mobile" : "pc";
  }
  detectDevice();
  window.addEventListener("resize", detectDevice);

  /* ---------- 2) 화면 전환 ---------- */
  var SCREENS = ["landing", "home", "detail"];
  function show(name) {
    SCREENS.forEach(function (s) { var el = $(s); if (el) el.hidden = (s !== name); });
    var scr = $(name); if (scr) scr.scrollTop = 0;
    // PC(웹)에서는 페이지(window)가 스크롤되므로 맨 위로
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  /* ---------- 3) 랜딩 / 로그인 ---------- */
  var selectedGrade = null;

  document.querySelectorAll(".lp-grade").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectedGrade = btn.dataset.grade;
      $("lpLoginT").textContent = selectedGrade + "학년 로그인";
      $("lpGrades").hidden = true;
      $("lpLogin").hidden = false;
      $("lpHak").focus();
    });
  });

  $("lpBack").addEventListener("click", function () {
    selectedGrade = null;
    $("lpLogin").hidden = true;
    $("lpGrades").hidden = false;
    clearErr();
  });

  /* ---------- 교사용 로그인 (이름 검색 + 코드, 1·2학년 통합 보기) ---------- */
  function tErr(m) { var e = $("lpTErr"); e.textContent = m; e.hidden = false; }
  // 교사 명단에서 이름으로 조회(공백 무시)
  function findTeacher(name) {
    var list = window.TEACHERS || [];
    var key = normName(name);
    for (var i = 0; i < list.length; i++) { if (normName(list[i].name) === key) return list[i]; }
    return null;
  }
  // 이름 입력 자동완성: 입력값이 포함된 교사 이름 후보를 보여준다
  function renderTeacherSug() {
    var box = $("lpTSug");
    var q = normName($("lpTName").value);
    if (!q) { box.hidden = true; box.innerHTML = ""; return; }
    var hits = (window.TEACHERS || []).filter(function (t) {
      return normName(t.name).indexOf(q) !== -1;
    }).slice(0, 8);
    if (!hits.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.innerHTML = hits.map(function (t) {
      return '<button type="button" class="lp-sug-item" data-name="' + esc(t.name) + '">'
        + '<span class="lp-sug-nm">' + esc(t.name) + '</span>'
        + (t.subject ? '<span class="lp-sug-sub">' + esc(t.subject) + '</span>' : "")
        + '</button>';
    }).join("");
    box.hidden = false;
  }
  $("lpTName").addEventListener("input", renderTeacherSug);
  $("lpTSug").addEventListener("click", function (e) {
    var it = e.target.closest(".lp-sug-item"); if (!it) return;
    $("lpTName").value = it.dataset.name;
    $("lpTSug").hidden = true; $("lpTSug").innerHTML = "";
    $("lpCode").focus();
  });
  $("lpTeacherBtn").addEventListener("click", function () {
    $("lpGrades").hidden = true;
    $("lpTeacher").hidden = false;
    $("lpTErr").hidden = true;
    $("lpTName").value = "";
    $("lpCode").value = "";
    $("lpTSug").hidden = true; $("lpTSug").innerHTML = "";
    $("lpTName").focus();
  });
  $("lpTBack").addEventListener("click", function () {
    $("lpTeacher").hidden = true;
    $("lpGrades").hidden = false;
    $("lpTErr").hidden = true;
  });
  $("lpTBtn").addEventListener("click", function () {
    var raw = $("lpTName").value.trim();
    var t = findTeacher(raw);
    if (!t) { tErr("교사 명단에서 이름을 찾을 수 없어요."); return; }
    if ($("lpCode").value.trim() !== TEACHER_CODE) { tErr("교사용 코드가 올바르지 않아요."); return; }
    localStorage.setItem(KEY.grade, "T");
    localStorage.setItem(KEY.hak, "");
    localStorage.setItem(KEY.name, t.name);
    enterHome(t.name);
  });
  ["lpTName", "lpCode"].forEach(function (id) {
    $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") $("lpTBtn").click(); });
  });

  function clearErr() { var e = $("lpErr"); e.hidden = true; e.textContent = ""; }
  function showErr(m) { var e = $("lpErr"); e.textContent = m; e.hidden = false; }

  // 학년별 명렬 데이터셋 (1학년=STUDENTS1, 2학년=STUDENTS).
  //   각 레코드: { name, cls, no, slots:[A..N 과목] }.  데이터가 없으면 null.
  function datasetFor(grade) {
    if (grade === "1") return window.STUDENTS1 || null;
    if (grade === "2") return window.STUDENTS || null;
    return null;
  }
  // 이름 비교용 정규화(공백 제거)
  function normName(s) { return String(s || "").replace(/\s+/g, ""); }

  $("lpLoginBtn").addEventListener("click", function () {
    var hak  = $("lpHak").value.trim();
    var name = $("lpName").value.trim();
    if (!/^\d{5}$/.test(hak)) { showErr("학번 5자리를 정확히 입력해 주세요."); return; }
    if (name.length < 2)      { showErr("이름을 입력해 주세요."); return; }

    // 명렬 검증: 데이터가 있으면 학번 + 이름 일치 확인
    var ds = datasetFor(selectedGrade);
    if (ds) {
      var rec = ds[hak];
      if (!rec) { showErr("등록되지 않은 학번이에요. 다시 확인해 주세요."); return; }
      if (normName(rec.name) !== normName(name)) {
        showErr("학번과 이름이 일치하지 않아요."); return;
      }
      name = rec.name; // 정식 표기로 보정
    }

    clearErr();
    localStorage.setItem(KEY.grade, selectedGrade || "");
    localStorage.setItem(KEY.hak, hak);
    localStorage.setItem(KEY.name, name);
    enterHome(name);
  });

  ["lpHak", "lpName"].forEach(function (id) {
    $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") $("lpLoginBtn").click(); });
  });

  $("lpSkip").addEventListener("click", function () {
    localStorage.setItem(KEY.grade, selectedGrade || "");
    localStorage.setItem(KEY.name, "게스트");
    enterHome("게스트");
  });

  /* ---------- 4) 홈 ---------- */
  function pickChar(seed) {
    var s = 0, str = seed || "x";
    for (var i = 0; i < str.length; i++) s += str.charCodeAt(i);
    return CHARS[s % CHARS.length];
  }

  function setDday() {
    // 자정 기준 D-day 계산
    var ev = new Date(EVENT_DATE + "T00:00:00");
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((ev - today) / 86400000);
    var num;
    if (diff > 0)        num = "D-" + diff;
    else if (diff === 0) num = "D-DAY";
    else                 num = "박람회 종료";
    $("homeDday").textContent = num;
  }

  function enterHome(name) {
    var nm = (name && name !== "게스트") ? name + honorific(name) : "속초여고 학생";
    $("homeWho").textContent = nm;
    $("homeChar").src = pickChar(name);
    setDday();
    applyHome(name);
    show("home");
  }

  // 바로가기 카드 한 장
  function menuCard(go, ic, tt, sub) {
    return '<button class="m-card m-top" data-go="' + go + '">'
      + '<span class="m-ic"><img src="img/' + ic + '" alt="" aria-hidden="true" /></span>'
      + '<span class="m-tt">' + tt + '</span>'
      + '<span class="m-sub">' + sub + '</span></button>';
  }

  // 역할(학생/교사)에 따라 히어로 + 바로가기 메뉴를 다시 구성
  function applyHome(name) {
    var teacher = isTeacher();
    var hero = $("heroTimetable");
    var hT = hero.querySelector(".hc-title");
    var hS = hero.querySelector(".hc-sub");
    var menu = "";
    if (teacher) {
      hero.dataset.go = "duty";
      hT.textContent = "내 임장 일정";
      hS.textContent = "내 감독 시간·장소 확인";
      var t = findTeacher(name) || {};
      menu += menuCard("duty", "calander.png", "내 임장 일정", "내 감독 시간·장소");
      if (t.homeroom) menu += menuCard("myclass", "compass.png", "우리반 학생 위치", "타임별 이동 현황");
      menu += menuCard("schedule", "pin.png", "전체 일정 확인", "박람회 타임테이블");
      menu += menuCard("subjects", "graph.png", "교과별 부스 배치", "교과·타임별 운영 과목");
      menu += menuCard("surveyagg", "excel.png", "교과별 신청 인원", "수요조사 집계");
      menu += menuCard("curriculum", "school.png", "우리학교 편제표", "학년별 교육과정");
      menu += menuCard("ebook", "book.png", "E-Book 바로가기", "전자책 가이드북");
      menu += menuCard("metaverse", "Metaverse.png", "메타버스 박람회", "가상 공간 입장");
    } else {
      hero.dataset.go = "timetable";
      hT.textContent = "나의 시간표 확인";
      hS.textContent = "내가 선택한 과목 한눈에";
      menu += menuCard("survey", "pen.png", "1차 수요조사 결과", "학기별 신청 과목");
      menu += menuCard("recommend", "compass.png", "선택과목 추천", "나에게 맞는 과목 찾기");
      menu += menuCard("holland", "graph.png", "진로 성향 검사", "홀랜드 검사 + 과목 추천");
      menu += menuCard("ebook", "book.png", "E-Book 바로가기", "전자책 가이드북");
      menu += menuCard("metaverse", "Metaverse.png", "메타버스 박람회", "가상 공간 입장");
      menu += menuCard("curriculum", "school.png", "우리학교 편제표", "학년별 교육과정");
      menu += menuCard("schedule", "calander.png", "전체 일정 확인", "박람회 타임테이블");
    }
    $("menuGrid").innerHTML = menu;
  }

  /* ---------- 5) 메뉴 라우팅 ---------- */
  var MENU = {
    timetable:  "나의 시간표 확인",
    survey:     "1차 수요조사 결과",
    surveyagg:  "교과별 신청 인원",
    metaverse:  "메타버스 박람회 접속",
    curriculum: "우리학교 편제표 확인",
    schedule:   "전체 일정 확인",
    subjects:   "교과별 부스 배치",
    duty:       "임장 일정",
    myclass:    "우리반 학생 위치",
    holland:    "진로 성향 검사"
  };
  // 외부 링크로 바로 연결되는 메뉴 — TODO: 실제 메타버스 링크로 교체
  var LINKS = {
    metaverse: ""
  };
  // 학년별 E-Book 가이드북 링크 — TODO: 실제 이북 링크로 교체
  var EBOOK = {
    "1": "",
    "2": ""
  };
  // 앱에 내장된 페이지(같은 탭 이동, 로그인 세션 공유)
  var PAGES = {
    recommend: "recommend/index.html"   // 선택과목 추천
  };

  function handleGo(key) {
    if (!key) return;
    if (key === "ebook") { openEbook(); return; }                    // 학년별 분기
    if (PAGES[key]) { window.location.href = PAGES[key]; return; }   // 세션 그대로 이어짐
    if (LINKS[key]) { window.open(LINKS[key], "_blank", "noopener"); return; }
    openDetail(key);
  }
  // 메뉴/히어로는 역할에 따라 동적으로 다시 그리므로 위임 방식으로 처리
  $("menuGrid").addEventListener("click", function (e) {
    var card = e.target.closest(".m-card[data-go]");
    if (card) handleGo(card.dataset.go);
  });
  function openDetail(key) {
    $("detailTitle").textContent = MENU[key] || "안내";
    if (key === "timetable")   renderTimetable();
    else if (key === "survey") renderSurvey();
    else if (key === "surveyagg") renderSurveyAgg();
    else if (key === "schedule") renderSchedule();
    else if (key === "subjects") renderSubjects();
    else if (key === "curriculum") renderCurriculum();
    else if (key === "duty") renderDuty();
    else if (key === "myclass") renderMyClass();
    else if (key === "holland") renderHolland();
    else renderSoon();
    show("detail");
  }
  $("detailBack").addEventListener("click", function () { show("home"); });

  // E-Book: 학생은 본인 학년 책으로 바로, 교사는 1·2학년을 좌우 2단으로 임베드
  function ebookCol(grade) {
    var url = EBOOK[grade];
    return '<div class="eb-col">'
      + '<div class="eb-h">' + grade + '학년 E-Book'
      +   '<a class="eb-open" href="' + url + '" target="_blank" rel="noopener">새 창으로 열기 ↗</a></div>'
      + '<iframe class="eb-frame" src="' + url + '" loading="lazy" allowfullscreen></iframe>'
      + '</div>';
  }
  function openEbook() {
    var grades = viewGrades();
    if (grades.length === 1) { window.open(EBOOK[grades[0]], "_blank", "noopener"); return; }
    $("detailTitle").textContent = "E-Book 바로가기";
    $("detailBody").innerHTML = ''
      + '<p class="tt-note"><b>1·2학년 E-Book 가이드북</b>을 좌우로 함께 볼 수 있어요.</p>'
      + '<div class="eb-grid">' + ebookCol("1") + ebookCol("2") + '</div>';
    show("detail");
  }

  /* ---------- 나의 시간표 ----------
     14타임(A~N) 구성. 타임별 시간은 공통, 수강 과목은 학생(학번)마다 다름.
     데이터: data_students1.js → window.STUDENTS1[학번].slots = [A..N 과목명].
       로그인한 학생의 학번/학년으로 본인 데이터만 조회해 표시한다.
       (게스트·미등록 학년은 DEMO_SLOTS 샘플 표시) */
  // A~N = 1~14타임 (각 20분). 과목설명회 실제 시간표 기준.
  var TIME_SLOTS = [
    "8:40 ~ 9:00", "9:10 ~ 9:30", "9:40 ~ 10:00", "10:10 ~ 10:30",
    "10:40 ~ 11:00", "11:10 ~ 11:30", "11:40 ~ 12:00", "12:10 ~ 12:30",
    "13:30 ~ 13:50", "14:00 ~ 14:20", "14:30 ~ 14:50", "15:00 ~ 15:20",
    "15:30 ~ 15:50", "16:00 ~ 16:20"
  ];
  var SLOT_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
  var SLOT_COUNT = SLOT_LETTERS.length;

  // 게스트/데이터 없는 경우의 예시 시간표 (실제 부스 과목명 샘플)
  var DEMO_SLOTS = [
    "주제탐구 독서", "기하", "확률과 통계", "물리학 + 역학과 에너지",
    "화학 + 물질과 에너지", "생명과학 + 세포와 물질대사", "지구과학 + 지구시스템과학",
    "사회와 문화 + 법과 사회", "세계사 + 동아시아 역사 기행", "일본어 + 심화 일본어",
    "중국어 + 중국 문화", "영미문학읽기", "미술 창작", "음악 연주와 창작"
  ];

  function renderTimetable() {
    var hak   = localStorage.getItem(KEY.hak) || "";
    var grade = localStorage.getItem(KEY.grade) || "";
    var name  = localStorage.getItem(KEY.name) || "속초여고 학생";

    var ds   = datasetFor(grade);
    var rec  = (ds && ds[hak]) ? ds[hak] : null;
    var subjects = (rec && rec.slots) ? rec.slots : DEMO_SLOTS;  // [A..N] 과목명
    var clsLabel = rec ? (esc(rec.cls) + " · " + rec.no + "번") : "";

    var html = ""
      + '<div class="tt-head">'
      +   '<img src="' + pickChar(name) + '" alt="" onerror="this.style.display=\'none\'">'
      +   '<div><div class="tt-who">' + esc(name) + honorific(name) + '</div>'
      +   '<div class="tt-meta">'
      +     (hak ? "학번 " + esc(hak) + (clsLabel ? " · " + clsLabel : "") : "14타임 이동 시간표")
      +   '</div></div>'
      + '</div>'
      + '<p class="tt-note">각 타임의 <b>수강 과목</b>과 <b>이동 교실</b>을 확인하세요. 시간에 맞춰 이동해 주세요!</p>'
      + '<table class="tt-table"><thead><tr>'
      +   '<th class="c-time">타임</th><th class="c-when">시간</th><th>수강 과목 · 이동 교실</th>'
      + '</tr></thead><tbody>';

    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    for (var i = 0; i < SLOT_COUNT; i++) {
      var subj = subjects[i] || "-";
      var room = (ROOMS[subj] || {})[SLOT_LETTERS[i]] || "";
      html += '<tr>'
        +  '<td class="c-time"><span class="t-no">' + SLOT_LETTERS[i] + '</span></td>'
        +  '<td class="c-when"><span class="t-when">' + (TIME_SLOTS[i] || "") + '</span></td>'
        +  '<td><span class="t-subj">' + esc(subj) + '</span>'
        +     (room ? '<span class="t-room"><img class="t-pin" src="img/pin.png" alt="" aria-hidden="true">' + esc(room) + '</span>' : "")
        +  '</td>'
        + '</tr>';
    }
    html += '</tbody></table>';
    $("detailBody").innerHTML = html;
  }

  /* ---------- 전체 일정 (1·2학년 타임별 전체 부스·교실) ----------
     ROOMS_G1 / ROOMS_G2[과목][타임] = 교실. 타임별로 모든 부스를 모아 표시. */
  function buildScheduleTable(grade) {
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    var rows = "";
    for (var i = 0; i < SLOT_COUNT; i++) {
      var L = SLOT_LETTERS[i];
      var items = [];
      for (var subj in ROOMS) {
        var rm = ROOMS[subj][L];
        if (rm) items.push({ subj: subj, room: rm });
      }
      items.sort(function (a, b) { return a.room.localeCompare(b.room, "ko", { numeric: true }); });
      var list = items.length
        ? '<ul class="sch-list">' + items.map(function (it) {
            return '<li><span class="t-subj">' + esc(it.subj) + '</span>'
              + '<span class="t-room"><img class="t-pin" src="img/pin.png" alt="" aria-hidden="true">' + esc(it.room) + '</span></li>';
          }).join("") + '</ul>'
        : '<span class="sch-empty">운영 부스 없음</span>';
      rows += '<tr>'
        + '<td class="c-time"><span class="t-no">' + L + '</span></td>'
        + '<td class="c-when"><span class="t-when">' + (TIME_SLOTS[i] || "") + '</span></td>'
        + '<td>' + list + '</td>'
        + '</tr>';
    }
    return '<table class="tt-table sch-table"><thead><tr>'
      + '<th class="c-time">타임</th><th class="c-when">시간</th><th>운영 부스 (과목 · 교실)</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  // 반별 표(행렬): 열=교실, 행=A~N 타임, 칸=과목
  function buildMatrix(grade) {
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    var roomset = {};
    for (var s in ROOMS) for (var t in ROOMS[s]) roomset[ROOMS[s][t]] = 1;
    var rooms = Object.keys(roomset).sort(function (a, b) { return a.localeCompare(b, "ko", { numeric: true }); });
    var cell = {};
    SLOT_LETTERS.forEach(function (L) { cell[L] = {}; });
    for (var s2 in ROOMS) for (var t2 in ROOMS[s2]) cell[t2][ROOMS[s2][t2]] = s2;

    var head = '<tr><th class="mx-corner">타임</th>'
      + rooms.map(function (r) { return '<th>' + esc(r) + '</th>'; }).join("") + '</tr>';
    var body = "";
    for (var i = 0; i < SLOT_COUNT; i++) {
      var L = SLOT_LETTERS[i];
      body += '<tr><th>' + L + '<span class="mx-when">' + (TIME_SLOTS[i] || "") + '</span></th>'
        + rooms.map(function (r) {
            var v = cell[L][r];
            return v ? '<td>' + esc(v) + '</td>' : '<td class="empty">·</td>';
          }).join("") + '</tr>';
    }
    return '<div class="mx-wrap"><table class="mx-table"><thead>' + head
      + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  // 학년 탭 HTML (보여줄 학년이 2개 이상일 때만 표시)
  function gradeTabsHtml(id, grades, cur) {
    if (grades.length < 2) return "";
    return '<div class="sch-tabs" id="' + id + '">'
      + grades.map(function (g) {
          return '<button class="sch-tab' + (g === cur ? " on" : "") + '" data-g="' + g + '">' + g + '학년</button>';
        }).join("")
      + '</div>';
  }

  function renderSchedule() {
    var grades = viewGrades();
    var grade = grades[0];
    var mode = "list";   // list = 타임별 목록, grid = 반별 표

    function paint() {
      document.querySelectorAll("#schModes .sch-tab").forEach(function (b) {
        b.classList.toggle("on", b.dataset.m === mode);
      });
      document.querySelectorAll("#schTabs .sch-tab").forEach(function (b) {
        b.classList.toggle("on", b.dataset.g === grade);
      });
      $("schBody").innerHTML = (mode === "grid") ? buildMatrix(grade) : buildScheduleTable(grade);
    }

    var note = isTeacher()
      ? 'A~N 타임별 <b>전체 부스</b>와 <b>교실 위치</b>예요. 보기 방식과 학년을 골라 확인하세요.'
      : 'A~N 타임별 <b>' + grade + '학년 전체 부스</b>와 <b>교실 위치</b>예요. 보기 방식을 골라 확인하세요.';

    $("detailBody").innerHTML = ''
      + '<div class="ag-top">'
      +   '<p class="tt-note ag-top-note">' + note + '</p>'
      +   '<button class="mc-print ag-xlsx" id="schXlsx"><img class="btn-ic" src="img/excel.png" alt="" aria-hidden="true">엑셀</button>'
      + '</div>'
      + '<div class="sch-modes" id="schModes">'
      +   '<button class="sch-tab" data-m="list">타임별 목록</button>'
      +   '<button class="sch-tab" data-m="grid">반별 표</button>'
      + '</div>'
      + gradeTabsHtml("schTabs", grades, grade)
      + '<div id="schBody"></div>'
      + (isTeacher() ? '<a class="sch-grid-link" href="schedule_all.html">🖨️ 1·2학년 한 페이지로(인쇄용) 열기</a>' : '');

    $("schXlsx").addEventListener("click", function () { downloadSchedule(grade); });
    document.querySelectorAll("#schModes .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { mode = b.dataset.m; paint(); });
    });
    document.querySelectorAll("#schTabs .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { grade = b.dataset.g; paint(); });
    });
    paint();
  }

  /* ---------- 교과별 부스 배치 ----------
     국/수/영/사/과/보건/정보/일본어/중국어 9개 교과로 분류해
     교과 선택 시 각 타임(A~N)에 운영되는 과목·교실을 보여준다.
     분류 규칙(우선순위):
       1) '탐구 프로젝트(R&E)' → 과학 (※ 사용자 지정)
       2) 보건 → 보건,  일본 → 일본어,  중국 → 중국어
       3) 그 외에는 SUBJECT_META의 dept로 매핑 (제2외국어/교양/예술/체육은 위에서 처리·제외) */
  var SUBJ_CATS = ["국어", "수학", "영어", "사회", "과학", "보건", "정보", "일본어", "중국어"];
  var DEPT2CAT = { "국어": "국어", "수학": "수학", "영어": "영어", "사회": "사회", "과학": "과학", "정보": "정보" };

  // 학년별 SUBJECT_META를 공백 무시 키로 색인(캐시) — "미적분 Ⅱ" vs "미적분Ⅱ" 차이 흡수
  var _normMeta = {};
  function normMetaFor(g) {
    if (_normMeta[g]) return _normMeta[g];
    var mg = (window.SUBJECT_META || {})[g] || {}, out = {};
    for (var k in mg) out[normName(k)] = mg[k];
    return (_normMeta[g] = out);
  }

  function catOf(key, grade) {
    if (/탐구\s*프로젝트|R&E/i.test(key)) return "과학";
    if (key.indexOf("보건") !== -1) return "보건";
    if (key.indexOf("일본") !== -1) return "일본어";
    if (key.indexOf("중국") !== -1) return "중국어";
    var parts = key.split(/\s*[&+·]\s*/);              // 결합 과목명 분리
    var gs = grade ? [grade, (grade === "1" ? "2" : "1")] : ["1", "2"];
    for (var gi = 0; gi < gs.length; gi++) {
      var nm = normMetaFor(gs[gi]);
      for (var pi = 0; pi < parts.length; pi++) {
        var m = nm[normName(parts[pi])];
        if (m && DEPT2CAT[m.dept]) return DEPT2CAT[m.dept];
      }
    }
    return null;
  }

  // 2단계 세부 분류 (사회/과학만). '전체'는 항상 첫 칩.
  var SOC_SUBS = ["전체", "일반사회", "윤리", "지리", "역사", "기타"];
  var SCI_SUBS = ["전체", "물리학", "화학", "생명과학", "지구과학", "기타"];

  function socSub(key) {
    if (/윤리|사상/.test(key)) return "윤리";
    if (/역사|한국사|세계사|동아시아/.test(key)) return "역사";
    if (/지리|도시|기후|국토|세계시민/.test(key)) return "지리";
    if (/사회와 문화|정치|법|경제|금융|국제|사회문제|문화/.test(key)) return "일반사회";
    return "기타";
  }
  function sciSub(key) {
    if (/탐구\s*프로젝트|R&E|융합과학/i.test(key)) return "기타";
    if (/물리|역학|전자기|양자/.test(key)) return "물리학";
    if (/생명|생물|유전|세포/.test(key)) return "생명과학";   // '물질대사'의 물질 오인 방지: 화학보다 먼저
    if (/화학|물질/.test(key)) return "화학";
    if (/지구|우주|행성|천체/.test(key)) return "지구과학";
    return "기타";
  }
  // 교과(cat) 안에서의 세부 분류명 (세부 분류가 없는 교과는 null)
  function subOf(cat, key) {
    if (cat === "사회") return socSub(key);
    if (cat === "과학") return sciSub(key);
    return null;
  }

  function subjGroups(grade) {
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    var map = {};
    for (var key in ROOMS) {
      var c = catOf(key, grade);
      if (!c) continue;
      (map[c] = map[c] || []).push(key);
    }
    return { ROOMS: ROOMS, map: map };
  }

  function buildSubjectTable(grade, cat, sub) {
    var g = subjGroups(grade), ROOMS = g.ROOMS, keys = g.map[cat] || [];
    if (sub && sub !== "전체") keys = keys.filter(function (k) { return subOf(cat, k) === sub; });
    var rows = "";
    for (var i = 0; i < SLOT_COUNT; i++) {
      var L = SLOT_LETTERS[i], items = [];
      keys.forEach(function (k) { var rm = ROOMS[k][L]; if (rm) items.push({ subj: k, room: rm }); });
      items.sort(function (a, b) { return a.room.localeCompare(b.room, "ko", { numeric: true }); });
      var slotL = L;
      var list = items.length
        ? '<ul class="sch-list">' + items.map(function (it) {
            return '<li><button class="ro-cell" data-slot="' + slotL + '" data-subj="' + esc(it.subj) + '">'
              + '<span class="t-subj">' + esc(it.subj) + '</span>'
              + '<span class="t-room"><img class="t-pin" src="img/pin.png" alt="" aria-hidden="true">' + esc(it.room) + '</span>'
              + '<span class="ro-go">출석부 ›</span>'
              + '</button></li>';
          }).join("") + '</ul>'
        : '<span class="sch-empty">이 타임에 운영 없음</span>';
      rows += '<tr>'
        + '<td class="c-time"><span class="t-no">' + L + '</span></td>'
        + '<td class="c-when"><span class="t-when">' + (TIME_SLOTS[i] || "") + '</span></td>'
        + '<td>' + list + '</td></tr>';
    }
    return '<table class="tt-table sch-table"><thead><tr>'
      + '<th class="c-time">타임</th><th class="c-when">시간</th><th>운영 과목 · 교실</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderSubjects(init) {
    var grades = viewGrades();
    var grade = (init && init.grade) || grades[0];
    var cat = (init && init.cat) || null;
    var sub = (init && init.sub) || "전체";

    function availCats(g) { var m = subjGroups(g).map; return SUBJ_CATS.filter(function (c) { return m[c]; }); }
    // 현재 교과의 세부 분류 칩 목록(데이터 있는 것만). 세부 분류 없는 교과면 null
    function subListFor(g, c) {
      var defs = (c === "사회") ? SOC_SUBS : (c === "과학") ? SCI_SUBS : null;
      if (!defs) return null;
      var keys = subjGroups(g).map[c] || [], present = {};
      keys.forEach(function (k) { present[subOf(c, k)] = 1; });
      return defs.filter(function (s) { return s === "전체" || present[s]; });
    }

    function paint() {
      var cats = availCats(grade);
      if (cats.indexOf(cat) === -1) { cat = cats[0]; sub = "전체"; }
      document.querySelectorAll("#sjTabs .sch-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.g === grade); });
      $("sjCats").innerHTML = cats.map(function (c) {
        return '<button class="sch-tab' + (c === cat ? " on" : "") + '" data-c="' + c + '">' + c + '</button>';
      }).join("");

      // 2단계 세부 분류 (사회/과학)
      var subs = subListFor(grade, cat);
      if (subs) {
        if (subs.indexOf(sub) === -1) sub = "전체";
        $("sjSubs").innerHTML = subs.map(function (s) {
          return '<button class="sch-tab' + (s === sub ? " on" : "") + '" data-s="' + s + '">' + s + '</button>';
        }).join("");
        $("sjSubs").hidden = false;
      } else {
        sub = "전체"; $("sjSubs").innerHTML = ""; $("sjSubs").hidden = true;
      }

      $("sjBody").innerHTML = buildSubjectTable(grade, cat, sub);
    }

    var note = isTeacher()
      ? '교과를 선택하면 <b>각 타임(A~N)에 운영되는 과목</b>과 <b>교실</b>을 보여줘요. 학년도 고를 수 있어요.'
      : '<b>' + grade + '학년</b> 교과를 선택하면 <b>각 타임(A~N)에 운영되는 과목</b>과 <b>교실</b>을 보여줘요.';

    $("detailBody").innerHTML = ''
      + '<p class="tt-note">' + note + '</p>'
      + gradeTabsHtml("sjTabs", grades, grade)
      + '<div class="subj-cats" id="sjCats"></div>'
      + '<div class="subj-cats subj-subs" id="sjSubs" hidden></div>'
      + '<div id="sjBody"></div>';

    document.querySelectorAll("#sjTabs .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { grade = b.dataset.g; paint(); });
    });
    $("sjCats").addEventListener("click", function (e) {
      var b = e.target.closest(".sch-tab"); if (!b) return; cat = b.dataset.c; sub = "전체"; paint();
    });
    // 과목 클릭 → 그 부스의 학생 출석부 (돌아가면 현재 교과/세부/학년 유지)
    $("sjBody").addEventListener("click", function (e) {
      var c = e.target.closest(".ro-cell"); if (!c) return;
      var keepGrade = grade, keepCat = cat, keepSub = sub;
      openRoster(grade, c.dataset.slot, c.dataset.subj, function () {
        renderSubjects({ grade: keepGrade, cat: keepCat, sub: keepSub });
      });
    });
    $("sjSubs").addEventListener("click", function (e) {
      var b = e.target.closest(".sch-tab"); if (!b) return; sub = b.dataset.s; paint();
    });
    paint();
  }

  // 전체 일정(반별 표) → CSV(엑셀): 열=교실, 행=A~N 타임
  function downloadSchedule(grade) {
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    var roomset = {};
    for (var s in ROOMS) for (var t in ROOMS[s]) roomset[ROOMS[s][t]] = 1;
    var rooms = Object.keys(roomset).sort(function (a, b) { return a.localeCompare(b, "ko", { numeric: true }); });
    var cell = {};
    SLOT_LETTERS.forEach(function (L) { cell[L] = {}; });
    for (var s2 in ROOMS) for (var t2 in ROOMS[s2]) cell[t2][ROOMS[s2][t2]] = s2;

    var rows = [["타임", "시간"].concat(rooms)];
    for (var i = 0; i < SLOT_COUNT; i++) {
      var L = SLOT_LETTERS[i];
      var row = [L, TIME_SLOTS[i] || ""];
      rooms.forEach(function (r) { row.push(cell[L][r] || ""); });
      rows.push(row);
    }
    downloadCsv("전체일정_" + grade + "학년.csv", rows);
  }

  /* ---------- 우리학교 편제표 (3개년 교육과정) ----------
     data_curriculum.js → window.CURRICULUM["1"|"2"] = 편제표 <table> HTML.
     '한눈에 보기' = 표 전체를 화면 폭에 맞게 자동 축소(scale), '원본 크기' = 가로 스크롤. */
  var pjFitBound = false;
  function fitCurriculum() {
    var body = $("pjBody"); if (!body) return;
    var fit = body.querySelector(".pj-fit");
    var sc  = body.querySelector(".pj-scale");
    if (!fit || !sc) return;
    var tbl = sc.querySelector("table"); if (!tbl) return;
    sc.style.transform = "none"; fit.style.height = "";
    var avail = fit.clientWidth || 1;
    var nat   = tbl.offsetWidth || 1;
    // 화면 폭에 맞춤: 좁으면 축소, 넓으면(PC) 확대해 폭을 가득 채움
    var s = avail / nat;
    sc.style.transform = "scale(" + s + ")";
    fit.style.height = Math.ceil(tbl.offsetHeight * s) + "px";
  }

  /* 편제표 후처리: '[택4]/[택6]' 선택 표시 셀을, 그 선택그룹 행 수만큼 세로 병합하고
     강조색을 입힌다. 원본(window.CURRICULUM)은 그대로 두고 가공본을 캐시.
       - 그룹 경계: pj-sec(새 구분) 또는 '내용 있는' pj-credit(새 이수학점 그룹).
         ※ 빈 이수학점 셀은 경계로 보지 않음 → 학기 끝 고아 과목도 같은 학기 [택N] 그룹에 포함되도록. */
  var _pjCache = {};
  function curriculumHtml(grade) {
    if (_pjCache[grade] != null) return _pjCache[grade];
    var raw = (window.CURRICULUM || {})[grade] || "";
    if (!raw) return (_pjCache[grade] = "");
    var div = document.createElement("div");
    div.innerHTML = raw;
    var table = div.querySelector("table");
    if (!table) return (_pjCache[grade] = raw);

    // rowspan/colspan을 반영한 격자 좌표 매핑 (셀의 논리적 열 위치 파악용)
    var rows = table.rows, grid = [];
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].cells, c = 0;
      grid[r] = grid[r] || [];
      for (var i = 0; i < cells.length; i++) {
        while (grid[r][c]) c++;
        var cell = cells[i], rsp = cell.rowSpan || 1, csp = cell.colSpan || 1;
        for (var dr = 0; dr < rsp; dr++) for (var dc = 0; dc < csp; dc++) {
          grid[r + dr] = grid[r + dr] || [];
          grid[r + dr][c + dc] = cell;
        }
        c += csp;
      }
    }
    function colOf(r, cell) { var g = grid[r] || []; for (var x = 0; x < g.length; x++) if (g[x] === cell) return x; return -1; }
    function boundary(r) {
      if (!rows[r]) return false;
      if (rows[r].querySelector(".pj-sec")) return true;               // 새 구분
      var cr = rows[r].querySelectorAll(".pj-credit");
      for (var i = 0; i < cr.length; i++) if ((cr[i].textContent || "").trim() !== "") return true;  // 내용 있는 이수학점 = 새 그룹
      return false;
    }

    // 병합 계획을 먼저 세운 뒤 일괄 적용 (DOM 변경이 격자 계산에 영향 주지 않도록)
    var plans = [];
    for (var r2 = 0; r2 < rows.length; r2++) {
      var tds = rows[r2].querySelectorAll("td.pj-sem");
      for (var k = 0; k < tds.length; k++) {
        var td = tds[k], txt = (td.textContent || "").trim();
        if (txt.indexOf("택") === -1) continue;
        var col = colOf(r2, td), remove = [];
        for (var rr = r2 + 1; rr < rows.length; rr++) {
          if (boundary(rr)) break;                              // 다음 선택그룹/구분 시작 → 종료
          var below = (grid[rr] || [])[col];
          if (!below || below.tagName !== "TD" || below.className.indexOf("pj-sem") === -1) break;
          if ((below.textContent || "").indexOf("택") !== -1) break;  // 다음 '택N' 표시 전까지
          remove.push(below);                                   // 그룹 내 같은 열(빈칸·부수 숫자) 흡수
        }
        plans.push({ td: td, span: 1 + remove.length, remove: remove, txt: txt });
      }
    }
    plans.forEach(function (p) {
      p.td.rowSpan = p.span;
      p.td.className = (p.td.className + " pj-pick").replace(/\s+/g, " ").trim();
      p.td.setAttribute("style", "background:#fbf1d5;color:#9a6b12;font-weight:800;");
      p.td.innerHTML = '<span class="pj-pick-t">' + esc(p.txt.replace(/[\[\]]/g, "")) + '</span>';
      p.remove.forEach(function (cc) { if (cc.parentNode) cc.parentNode.removeChild(cc); });
    });

    return (_pjCache[grade] = div.innerHTML);
  }

  // 편제표(복잡한 병합 표) → Excel(.xls) 다운로드.
  //   HTML <table>를 그대로 담아 Excel이 rowspan/colspan 병합을 인식하게 함.
  function downloadCurriculumXls(grade) {
    var table = curriculumHtml(grade);
    if (!table) return;
    var year = (grade === "1") ? "2026" : "2025";
    var title = "2026 속초여고 교육과정 편제표 · " + grade + "학년(" + year + "학년도 입학생)";
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
      + 'xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head>'
      + '<meta charset="utf-8">'
      + '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>'
      + '<x:Name>' + grade + '학년 편제표</x:Name>'
      + '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>'
      + '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'
      + '<style>table{border-collapse:collapse;}'
      + 'th,td{border:.5pt solid #888;padding:3px 6px;font-family:"Malgun Gothic";'
      + 'font-size:10pt;text-align:center;mso-number-format:"\\@";vertical-align:middle;}'
      + 'th{background:#eef1f4;font-weight:bold;}</style></head>'
      + '<body><h3>' + esc(title) + '</h3>' + table + '</body></html>';
    var blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "교육과정_편제표_" + grade + "학년.xls";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function renderCurriculum() {
    var data = window.CURRICULUM || null;
    if (!data) { renderSoon(); return; }

    var grades = viewGrades();
    var grade = grades[0];
    var teacher = isTeacher();
    var mode = "fit";   // fit = 한눈에(자동 축소), scroll = 원본 크기

    function paint() {
      document.querySelectorAll("#pjModes .sch-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.m === mode); });
      document.querySelectorAll("#pjTabs .sch-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.g === grade); });
      var html = curriculumHtml(grade);
      if (mode === "fit") {
        $("pjBody").innerHTML = '<div class="pj-fit"><div class="pj-scale">' + html + '</div></div>';
        requestAnimationFrame(fitCurriculum);
      } else {
        $("pjBody").innerHTML = '<div class="pj-wrap">' + html + '</div>';
      }
    }

    var pjNote = isTeacher()
      ? '학년별 <b>3개년 교육과정 편제표</b>예요. (1학년=2026학년도 입학생 · 2학년=2025학년도 입학생)'
      : '<b>' + grade + '학년 3개년 교육과정 편제표</b>예요. (' + (grade === "1" ? "2026" : "2025") + '학년도 입학생)';

    $("detailBody").innerHTML = ''
      + '<div class="ag-top">'
      +   '<p class="tt-note ag-top-note">' + pjNote + ' <b>한눈에 보기</b>는 화면에 맞춰 줄여 보여줘요.</p>'
      +   (teacher ? '<button class="mc-print ag-xlsx" id="pjXlsx"><img class="btn-ic" src="img/excel.png" alt="" aria-hidden="true">엑셀 다운로드</button>' : '')
      + '</div>'
      + '<div class="sch-modes" id="pjModes">'
      +   '<button class="sch-tab" data-m="fit">한눈에 보기</button>'
      +   '<button class="sch-tab" data-m="scroll">원본 크기</button>'
      + '</div>'
      + gradeTabsHtml("pjTabs", grades, grade)
      + '<div id="pjBody"></div>';

    if (teacher) $("pjXlsx").addEventListener("click", function () { downloadCurriculumXls(grade); });
    document.querySelectorAll("#pjModes .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { mode = b.dataset.m; paint(); });
    });
    document.querySelectorAll("#pjTabs .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { grade = b.dataset.g; paint(); });
    });

    if (!pjFitBound) {
      pjFitBound = true;
      window.addEventListener("resize", function () {
        if (document.querySelector("#pjBody .pj-fit")) fitCurriculum();
      });
    }
    paint();
  }

  function renderSoon() {
    $("detailBody").innerHTML = ''
      + '<div class="soon">'
      +   '<img class="d-char" src="img/char-soon.png" alt="" onerror="this.style.display=\'none\'">'
      +   '<div class="d-soon">준비 중인 기능이에요</div>'
      +   '<div class="d-desc">다음 단계에서 이어서 만들 예정이에요.</div>'
      + '</div>';
  }

  /* ---------- 1차 수요조사 결과 (학기별 신청 과목) ----------
     데이터: window.SURVEY1[학번] = { s1:[과목..], s2:[과목..] }  (1학기/2학기)
       아직 데이터 미연동 시 안내 화면을 보여준다. */
  // 선택유형(과목구분) → 칩 class/표시
  var KIND_CLASS = { "일반": "k-ilban", "진로": "k-jinro", "융합": "k-yung", "공통": "k-gong" };
  function subjTags(grade, name) {
    var META = window.SUBJECT_META || {};
    var m = (META[grade] || {})[name];
    if (!m) return "";
    var dept = m.dept ? '<span class="sv-dept">' + esc(m.dept) + '</span>' : "";
    var kind = m.kind ? '<span class="sv-kind ' + (KIND_CLASS[m.kind] || "") + '">' + esc(m.kind) + '</span>' : "";
    return '<span class="sv-tags">' + dept + kind + '</span>';
  }
  function semBlock(title, list, grade) {
    var items = (list && list.length)
      ? list.map(function (s) {
          return '<li class="sv-item"><span class="sv-nm">' + esc(s) + '</span>' + subjTags(grade, s) + '</li>';
        }).join("")
      : '<li class="sv-empty">신청 내역이 없어요</li>';
    return '<div class="sv-sem">'
      + '<div class="sv-sem-h"><span class="sv-badge">' + title + '</span>'
      +   '<span class="sv-cnt">' + ((list && list.length) || 0) + '과목</span></div>'
      + '<ul class="sv-list">' + items + '</ul>'
      + '</div>';
  }

  function renderSurvey() {
    var hak   = localStorage.getItem(KEY.hak) || "";
    var name  = localStorage.getItem(KEY.name) || "속초여고 학생";
    var teacher = isTeacher();
    var grades = viewGrades();
    var grade = grades[0];

    function dataFor(g) { return (g === "1") ? window.SURVEY1 : window.SURVEY; }

    // 교과별 신청 인원(별도 페이지) 바로가기 버튼
    var aggBtn = '<button class="ag-link" id="goAgg"><img class="ag-link-ic" src="img/excel.png" alt="" aria-hidden="true">교과별 신청 인원 보기 ›</button>';

    // 교사: 개인 신청 데이터가 없으므로 안내 + 집계 페이지 버튼만
    if (teacher) {
      $("detailBody").innerHTML = ''
        + '<p class="tt-note"><b>1차 수요조사</b> 결과예요. 교과별 신청 인원은 아래 버튼에서 확인하세요.</p>'
        + aggBtn;
      $("goAgg").addEventListener("click", function () { openDetail("surveyagg"); });
      return;
    }

    // 데이터 미연동
    var dataset = dataFor(grade);
    if (!dataset || !Object.keys(dataset).length) {
      $("detailBody").innerHTML = ''
        + '<div class="soon">'
        +   '<img class="d-char" src="img/char-loading.png" alt="" onerror="this.style.display=\'none\'">'
        +   '<div class="d-soon">곧 제공될 예정이에요</div>'
        +   '<div class="d-desc">1차 수요조사 신청 결과를 학기별로 보여드릴게요.</div>'
        + '</div>';
      return;
    }

    var data = dataset;
    var rec  = (data && data[hak]) ? data[hak] : null;

    var html = ''
      + '<div class="tt-head">'
      +   '<img src="' + pickChar(name) + '" alt="" onerror="this.style.display=\'none\'">'
      +   '<div><div class="tt-who">' + esc(name) + honorific(name) + '</div>'
      +   '<div class="tt-meta">' + (hak ? "학번 " + esc(hak) + " · " : "") + '1차 수요조사 신청 결과</div></div>'
      + '</div>'
      + '<p class="tt-note">내가 <b>1차 수요조사</b>에서 신청한 과목이에요. 과목 옆에 <b>교과</b>와 <b>일반·진로·융합</b> 구분을 함께 표시했어요.</p>';

    if (!rec) {
      html += '<div class="sv-none">신청 내역을 찾을 수 없어요. 학번을 확인해 주세요.</div>';
    } else {
      html += '<div class="sv-wrap">'
        + semBlock("1학기", rec.s1, grade)
        + semBlock("2학기", rec.s2, grade)
        + '</div>';
    }
    html += aggBtn;

    $("detailBody").innerHTML = html;
    $("goAgg").addEventListener("click", function () { openDetail("surveyagg"); });
  }

  /* ---------- 교과별 신청 인원 (별도 하위페이지) ----------
     window.SURVEY_AGG[grade] = {pick, s1:[{name,count}], s2:[...]} */
  function aggSemTable(title, pick, list, grade) {
    if (!list || !list.length) return "";
    var max = 1;
    list.forEach(function (it) { if (it.count > max) max = it.count; });
    var rows = list.map(function (it) {
      var w = Math.round((it.count / max) * 100);
      return '<tr><td class="ag-name"><span class="ag-nm">' + esc(it.name) + '</span>' + subjTags(grade, it.name) + '</td>'
        + '<td class="ag-bar"><span class="ag-fill" style="width:' + w + '%"></span></td>'
        + '<td class="ag-cnt">' + it.count + '<span class="ag-unit">명</span></td></tr>';
    }).join("");
    return '<div class="ag-sem">'
      + '<div class="sv-sem-h"><span class="sv-badge">' + title + '</span>'
      +   (pick ? '<span class="sv-cnt">택' + pick + '</span>' : "") + '</div>'
      + '<table class="ag-table"><tbody>' + rows + '</tbody></table>'
      + '</div>';
  }
  function buildAgg(grade) {
    var a = (window.SURVEY_AGG || {})[grade];
    if (!a || (!a.s1.length && !a.s2.length)) return '<div class="sv-none">집계 데이터를 찾을 수 없어요.</div>';
    return '<div class="ag-wrap">'
      + aggSemTable("1학기", a.pick, a.s1, grade)
      + aggSemTable("2학기", a.pick, a.s2, grade)
      + '</div>';
  }

  /* ---------- 교과별 신청 인원 — 그래프(막대차트) 보기 ---------- */
  var KIND_COLOR = { "일반": "#4f7d24", "진로": "#2f6bbf", "융합": "#c47b1e", "공통": "#9a9a9a" };
  function aggChartSem(title, pick, list, grade) {
    if (!list || !list.length) return "";
    var META = (window.SUBJECT_META || {})[grade] || {};
    var max = 1; list.forEach(function (it) { if (it.count > max) max = it.count; });
    var bw = 34, gap = 14, padL = 16, padR = 16, padT = 22, padB = 96, plotH = 200;
    var n = list.length;
    var w = padL + padR + n * bw + (n - 1) * gap;
    var h = padT + plotH + padB;
    var baseY = padT + plotH;
    var svg = '<line x1="' + padL + '" y1="' + baseY + '" x2="' + (w - padR) + '" y2="' + baseY + '" class="agc-axis"/>';
    list.forEach(function (it, i) {
      var x = padL + i * (bw + gap);
      var bh = Math.max(2, Math.round(it.count / max * plotH));
      var y = baseY - bh;
      var kind = (META[it.name] || {}).kind;
      var fill = KIND_COLOR[kind] || "#C97C97";
      var cx = x + bw / 2, ly = baseY + 10;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="5" fill="' + fill + '"/>'
        + '<text x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle" class="agc-val">' + it.count + '</text>'
        + '<text x="' + cx + '" y="' + ly + '" text-anchor="end" transform="rotate(-50 ' + cx + ' ' + ly + ')" class="agc-lbl">' + esc(it.name) + '</text>';
    });
    return '<div class="ag-sem">'
      + '<div class="sv-sem-h"><span class="sv-badge">' + title + '</span>'
      +   (pick ? '<span class="sv-cnt">택' + pick + '</span>' : "") + '</div>'
      + '<div class="agc-scroll"><svg class="agc-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + svg + '</svg></div>'
      + '</div>';
  }
  function buildAggChart(grade) {
    var a = (window.SURVEY_AGG || {})[grade];
    if (!a || (!a.s1.length && !a.s2.length)) return '<div class="sv-none">집계 데이터를 찾을 수 없어요.</div>';
    var legend = '<div class="agc-legend">'
      + '<span><i style="background:#4f7d24"></i>일반</span>'
      + '<span><i style="background:#2f6bbf"></i>진로</span>'
      + '<span><i style="background:#c47b1e"></i>융합</span></div>';
    return '<div class="ag-wrap">' + legend
      + aggChartSem("1학기", a.pick, a.s1, grade)
      + aggChartSem("2학기", a.pick, a.s2, grade)
      + '</div>';
  }

  // 집계 → CSV(엑셀) 다운로드
  function downloadAgg(grade) {
    var a = (window.SURVEY_AGG || {})[grade];
    if (!a) return;
    var META = (window.SUBJECT_META || {})[grade] || {};
    var rows = [["학기", "과목", "교과", "구분", "신청인원"]];
    [["1학기", a.s1], ["2학기", a.s2]].forEach(function (pair) {
      pair[1].forEach(function (it) {
        var m = META[it.name] || {};
        rows.push([pair[0], it.name, m.dept || "", m.kind || "", it.count]);
      });
    });
    downloadCsv("교과별_신청인원_" + grade + "학년.csv", rows);
  }

  function renderSurveyAgg() {
    var grades = viewGrades();
    var grade = grades[0];
    var mode = "bars";   // bars = 막대 목록, chart = 그래프

    function paint() {
      document.querySelectorAll("#agModes .sch-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.m === mode); });
      document.querySelectorAll("#agTabs .sch-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.g === grade); });
      $("agBody").innerHTML = (mode === "chart") ? buildAggChart(grade) : buildAgg(grade);
    }

    $("detailBody").innerHTML = ''
      + '<button class="ag-back" id="agBack">‹ 1차 수요조사 결과</button>'
      + '<div class="ag-top">'
      +   '<p class="tt-note ag-top-note"><b>1차 수요조사</b> 기준 <b>교과별 신청 인원</b>이에요.</p>'
      +   '<button class="mc-print ag-xlsx" id="agXlsx"><img class="btn-ic" src="img/excel.png" alt="" aria-hidden="true">엑셀 다운로드</button>'
      + '</div>'
      + '<div class="sch-modes" id="agModes">'
      +   '<button class="sch-tab" data-m="bars">막대 목록</button>'
      +   '<button class="sch-tab" data-m="chart">그래프</button>'
      + '</div>'
      + gradeTabsHtml("agTabs", grades, grade)
      + '<div id="agBody"></div>';

    $("agBack").addEventListener("click", function () { openDetail("survey"); });
    $("agXlsx").addEventListener("click", function () { downloadAgg(grade); });
    document.querySelectorAll("#agModes .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { mode = b.dataset.m; paint(); });
    });
    document.querySelectorAll("#agTabs .sch-tab").forEach(function (b) {
      b.addEventListener("click", function () { grade = b.dataset.g; paint(); });
    });
    paint();
  }

  /* ---------- 진로 성향 검사 (홀랜드 RIASEC) + 과목 추천 ----------
     data_holland.js → window.HOLLAND (유형·문항·과목 매핑).
     흐름: 소개 → 24문항 → 결과(6유형 그래프 + 대표유형) → 나에게 맞는 과목 추천.
     결과는 KEY.holland(localStorage)에 저장하여 재방문 시 바로 표시. */
  var HL_ORDER = ["R", "I", "A", "S", "E", "C"];
  var HL_ANS = ["전혀 아니다", "아니다", "그렇다", "매우 그렇다"];
  var HL_MAX = 12;   // 유형별 4문항 × 3점

  // 막대 그래프 단일색(핑크) 명암: 점수 높을수록 진하게 (t: 0=연함 ~ 1=진함)
  function hlShade(t) {
    t = Math.max(0, Math.min(1, t));
    var a = [250, 214, 227], b = [140, 63, 92];   // 연한 핑크 → 진한 로즈
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ','
      + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  // 추천 대상 학년(학생=본인 학년, 게스트/미상=1학년)
  function hlGrade() {
    var g = localStorage.getItem(KEY.grade) || "";
    return (g === "1" || g === "2") ? g : "1";
  }
  function hlZero() { return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }; }

  // 응답 → 유형별 점수
  function hlScores(answers) {
    var qs = (window.HOLLAND || {}).questions || [], s = hlZero();
    qs.forEach(function (q, i) { s[q.t] += (answers[i] > 0 ? answers[i] : 0); });
    return s;
  }
  // 유형 정렬(점수 내림차순, 동점은 RIASEC 순)
  function hlRankTypes(scores) {
    return HL_ORDER.slice().sort(function (a, b) {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      return HL_ORDER.indexOf(a) - HL_ORDER.indexOf(b);
    });
  }
  // 과목명 → 성향 벡터(교과 기본 + 키워드 보정)
  function hlSubjectVec(name, meta) {
    var H = window.HOLLAND || {}, base = (H.deptVec || {})[meta.dept] || {}, v = hlZero();
    for (var k in base) v[k] += base[k];
    (H.rules || []).forEach(function (rule) {
      if (rule.re.test(name)) for (var kk in rule.vec) v[kk] += rule.vec[kk];
    });
    return v;
  }
  // 학생 성향(pref) 기준으로 학년 선택과목을 코사인 유사도로 정렬해 상위 N개 추천
  function hlRecommend(grade, pref, topN) {
    var META = (window.SUBJECT_META || {})[grade] || {};
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    var boothKeys = Object.keys(ROOMS);
    var kindRank = { "진로": 0, "융합": 1, "일반": 2 };
    var out = [];
    for (var name in META) {
      var m = META[name];
      if (!m || m.kind === "공통") continue;   // 공통(필수)과목 제외 → 선택과목만 추천
      var v = hlSubjectVec(name, m), dot = 0, mag = 0;
      HL_ORDER.forEach(function (t) { dot += (pref[t] || 0) * (v[t] || 0); mag += (v[t] || 0) * (v[t] || 0); });
      var score = dot / (Math.sqrt(mag) || 1);
      var booth = null;
      for (var bi = 0; bi < boothKeys.length; bi++) {
        if (boothKeys[bi].indexOf(name) !== -1) { booth = boothKeys[bi]; break; }
      }
      out.push({ name: name, dept: m.dept, kind: m.kind, vec: v, score: score, booth: booth });
    }
    out.sort(function (a, b) {
      if (Math.abs(b.score - a.score) > 1e-9) return b.score - a.score;
      var ra = kindRank[a.kind], rb = kindRank[b.kind];
      ra = (ra == null ? 3 : ra); rb = (rb == null ? 3 : rb);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "ko");
    });
    return out.slice(0, topN || 8);
  }
  // 추천 사유: 학생 상위 유형 중 이 과목이 지닌 성향 1~2개를 문구로
  function hlReason(item, topTypes) {
    var H = window.HOLLAND || {};
    var hits = topTypes.filter(function (t) { return (item.vec[t] || 0) > 0; });
    hits.sort(function (a, b) { return (item.vec[b] || 0) - (item.vec[a] || 0); });
    hits = hits.slice(0, 2);
    if (!hits.length) hits = [hlRankTypes(item.vec)[0]];
    var names = hits.map(function (t) { return (H.types[t] || {}).name || t; });
    return names.join("·") + " 성향과 잘 맞아요";
  }

  function renderHolland() {
    if (!window.HOLLAND) { renderSoon(); return; }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY.holland) || "null"); } catch (e) {}
    if (saved && saved.scores) hlShowResult(saved.scores);
    else hlShowIntro();
  }

  // 1) 소개 화면
  function hlShowIntro() {
    var H = window.HOLLAND, T = H.types;
    var chips = HL_ORDER.map(function (t) {
      var ty = T[t];
      return '<div class="hl-tchip" style="border-color:' + ty.color + '33">'
        + '<span class="hl-tchip-ic">'
        +   '<img class="hl-tchip-img" src="' + ty.img + '" alt="" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'">'
        +   '<span class="hl-tchip-emoji" style="display:none">' + ty.emoji + '</span></span>'
        + '<span class="hl-tchip-nm" style="color:' + ty.color + '">' + esc(ty.name) + '</span>'
        + '<span class="hl-tchip-en">' + esc(ty.tag) + '</span></div>';
    }).join("");
    $("detailBody").innerHTML = ''
      + '<div class="hl-intro">'
      +   '<div class="hl-hero">'
      +     '<div class="hl-hero-emoji"><img class="hl-hero-img" src="img/compass.png" alt="" onerror="this.parentNode.textContent=\'🧭\'"></div>'
      +     '<div class="hl-hero-t">나의 진로 성향 검사</div>'
      +     '<div class="hl-hero-s">홀랜드(RIASEC) 검사로 나의 흥미 유형을 알아보고,<br>속초여고 과목 중 <b>나에게 맞는 선택과목</b>을 추천받아요.</div>'
      +   '</div>'
      +   '<div class="hl-tgrid">' + chips + '</div>'
      +   '<p class="tt-note">총 <b>24문항</b> · 약 2분이면 끝나요. 솔직하게 답할수록 정확해요!</p>'
      +   '<button class="hl-btn hl-btn-go" id="hlStart">검사 시작하기 ▶</button>'
      + '</div>';
    $("hlStart").addEventListener("click", hlShowTest);
  }

  // 2) 문항 화면
  function hlShowTest() {
    var H = window.HOLLAND, qs = H.questions;
    var answers = qs.map(function () { return -1; });

    var cards = qs.map(function (q, i) {
      var opts = HL_ANS.map(function (label, v) {
        return '<button type="button" class="hl-opt" data-q="' + i + '" data-v="' + v + '">' + esc(label) + '</button>';
      }).join("");
      return '<div class="hl-q" id="hlq' + i + '">'
        + '<div class="hl-q-t"><span class="hl-q-no">' + (i + 1) + '</span>' + esc(q.q) + '</div>'
        + '<div class="hl-opts">' + opts + '</div></div>';
    }).join("");

    $("detailBody").innerHTML = ''
      + '<p class="tt-note">각 문항이 <b>나와 얼마나 비슷한지</b> 골라주세요.</p>'
      + '<div class="hl-progress"><div class="hl-track"><span class="hl-fill" id="hlBar"></span></div>'
      +   '<span class="hl-progress-txt" id="hlPct">0 / ' + qs.length + '</span></div>'
      + '<div class="hl-qs" id="hlQs">' + cards + '</div>'
      + '<button class="hl-btn hl-btn-go" id="hlSubmit" disabled>결과 보기</button>';

    function answered() { var n = 0; answers.forEach(function (a) { if (a >= 0) n++; }); return n; }
    function refresh() {
      var n = answered();
      $("hlBar").style.width = Math.round(n / qs.length * 100) + "%";
      $("hlPct").textContent = n + " / " + qs.length;
      $("hlSubmit").disabled = (n < qs.length);
    }
    $("hlQs").addEventListener("click", function (e) {
      var b = e.target.closest(".hl-opt"); if (!b) return;
      var qi = +b.dataset.q, v = +b.dataset.v;
      answers[qi] = v;
      var card = $("hlq" + qi);
      card.querySelectorAll(".hl-opt").forEach(function (o) { o.classList.toggle("on", +o.dataset.v === v); });
      card.classList.add("done");
      refresh();
    });
    $("hlSubmit").addEventListener("click", function () {
      if (answered() < qs.length) return;
      var scores = hlScores(answers);
      try { localStorage.setItem(KEY.holland, JSON.stringify({ scores: scores, ts: Date.now() })); } catch (e) {}
      hlShowResult(scores);
    });
    var body = $("detail"); if (body) body.scrollTop = 0;
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  // 3) 결과 화면
  function hlShowResult(scores) {
    var H = window.HOLLAND, T = H.types;
    var name = localStorage.getItem(KEY.name) || "속초여고 학생";
    var grade = hlGrade();
    var rank = hlRankTypes(scores);
    var top3 = rank.slice(0, 3);
    var code = top3.join("");
    var topName = top3.map(function (t) { return T[t].name; }).join("·");
    var maxScore = Math.max(1, scores[rank[0]]);

    // 6유형 막대 그래프
    var bars = rank.map(function (t) {
      var ty = T[t], w = Math.round(scores[t] / maxScore * 100);
      var pct = Math.round(scores[t] / HL_MAX * 100);
      var col = hlShade(0.28 + 0.72 * (scores[t] / maxScore));   // 단일 핑크, 점수순 명암
      return '<div class="hl-bar-row">'
        + '<div class="hl-bar-lb"><img class="hl-bar-ic" src="' + ty.img + '" alt="" onerror="this.style.display=\'none\'">'
        +   '<span class="hl-bar-nm">' + esc(ty.name) + '</span></div>'
        + '<div class="hl-bar-track"><span class="hl-bar-fill" style="width:' + w + '%;background:' + col + '"></span></div>'
        + '<div class="hl-bar-val">' + pct + '</div></div>';
    }).join("");

    // 대표 유형(1·2위) 상세 카드
    var detailCards = top3.slice(0, 2).map(function (t, idx) {
      var ty = T[t];
      return '<div class="hl-type-card">'
        + '<div class="hl-type-h">'
        +   '<span class="hl-type-ic"><img class="hl-type-img" src="' + ty.img + '" alt="" '
        +     'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">'
        +     '<span class="hl-type-emoji" style="display:none">' + ty.emoji + '</span></span>'
        +   '<div class="hl-type-htxt">'
        +     '<span class="hl-type-badge' + (idx === 0 ? ' on' : '') + '">' + (idx === 0 ? "대표 유형" : "보조 유형") + '</span>'
        +     '<div class="hl-type-nmrow"><span class="hl-type-nm">' + esc(ty.name) + '</span>'
        +       '<span class="hl-type-en">' + esc(ty.tag) + '</span></div>'
        +   '</div>'
        + '</div>'
        + '<div class="hl-type-desc">' + esc(ty.desc) + '</div>'
        + '<div class="hl-tags">' + ty.traits.map(function (x) { return '<span class="hl-tag">#' + esc(x) + '</span>'; }).join("") + '</div>'
        + '<div class="hl-jobs"><span class="hl-jobs-k">어울리는 진로</span>'
        +   ty.jobs.map(function (j) { return '<span class="hl-job">' + esc(j) + '</span>'; }).join("") + '</div>'
        + '</div>';
    }).join("");

    // 성향 벡터(0~1)로 추천
    var pref = hlZero();
    HL_ORDER.forEach(function (t) { pref[t] = scores[t] / HL_MAX; });
    var recs = hlRecommend(grade, pref, 8);
    var kindCls = { "일반": "k-ilban", "진로": "k-jinro", "융합": "k-yung", "공통": "k-gong" };
    var recHtml = recs.map(function (it, i) {
      var kc = kindCls[it.kind] || "";
      return '<li class="hl-rec">'
        + '<span class="hl-rec-rank">' + (i + 1) + '</span>'
        + '<div class="hl-rec-body">'
        +   '<div class="hl-rec-top"><span class="hl-rec-nm">' + esc(it.name) + '</span>'
        +     '<span class="sv-dept">' + esc(it.dept) + '</span>'
        +     '<span class="sv-kind ' + kc + '">' + esc(it.kind) + '</span>'
        +     (it.booth ? '<span class="hl-rec-booth">🎪 박람회 부스</span>' : '') + '</div>'
        +   '<div class="hl-rec-why">' + esc(hlReason(it, top3)) + '</div>'
        + '</div></li>';
    }).join("");

    $("detailBody").innerHTML = ''
      + '<div class="hl-result-head">'
      +   '<div class="hl-result-ic">'
      +     '<img class="hl-result-img" src="' + T[top3[0]].img + '" alt="" onerror="this.style.display=\'none\'">'
      +   '</div>'
      +   '<div class="hl-code">' + esc(code) + '</div>'
      +   '<div class="hl-code-sub"><b>' + esc(name) + honorific(name) + '</b>의 진로 성향은</div>'
      +   '<div class="hl-code-nm">' + esc(topName) + '</div>'
      + '</div>'
      + '<div class="hl-panel"><div class="hl-panel-h">유형별 성향 점수</div>'
      +   '<div class="hl-bars">' + bars + '</div></div>'
      + detailCards
      + '<div class="hl-panel">'
      +   '<div class="hl-panel-h"><img class="hl-panel-ic" src="img/target.png" alt="" onerror="this.style.display=\'none\'">나에게 맞는 <b>' + grade + '학년 선택과목</b> 추천</div>'
      +   '<p class="hl-rec-note">내 흥미 유형과 잘 맞는 과목이에요. 박람회에서 직접 확인해 보세요!</p>'
      +   '<ul class="hl-recs">' + recHtml + '</ul>'
      + '</div>'
      + '<div class="hl-actions">'
      +   '<button class="hl-btn hl-btn-sub" id="hlRetry">다시 검사하기</button>'
      + '</div>'
      + '<p class="hl-disc">※ 이 검사는 진로 탐색을 돕기 위한 참고용이에요. 최종 과목 선택은 담임·교과 선생님과 상담해 결정하세요.</p>';

    $("hlRetry").addEventListener("click", function () {
      try { localStorage.removeItem(KEY.holland); } catch (e) {}
      hlShowTest();
    });
    var body = $("detail"); if (body) body.scrollTop = 0;
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  /* ---------- (교사) 임장 일정 ----------
     window.DUTY[교사이름] = [{time:"A", booth, room, grade}], 배정표는 추후 제공 */
  var SLOT_ORDER = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13 };
  function renderDuty() {
    var name = localStorage.getItem(KEY.name) || "";
    var t = findTeacher(name) || {};
    var head = '<div class="tt-head">'
      + '<img src="' + pickChar(name) + '" alt="" onerror="this.style.display=\'none\'">'
      + '<div><div class="tt-who">' + esc(name) + honorific(name) + '</div>'
      + '<div class="tt-meta">' + (t.subject ? esc(t.subject) + ' · ' : '') + '임장(감독) 일정</div></div>'
      + '</div>';

    var my = (window.DUTY || {})[name] || [];
    if (!my.length) {
      $("detailBody").innerHTML = head
        + '<div class="soon">'
        +   '<img class="d-char" src="img/char-loading.png" alt="" onerror="this.style.display=\'none\'">'
        +   '<div class="d-soon">임장 배정표 준비 중이에요</div>'
        +   '<div class="d-desc">감독 배정표가 확정되면, 선생님이 <b>어느 타임</b>에 <b>어느 부스·교실</b>에 들어가야 하는지 여기에서 바로 보여드릴게요.</div>'
        + '</div>';
      return;
    }
    my = my.slice().sort(function (a, b) { return (SLOT_ORDER[a.time] || 0) - (SLOT_ORDER[b.time] || 0); });
    var rows = my.map(function (d) {
      var i = SLOT_ORDER[d.time] || 0;
      return '<tr>'
        + '<td class="c-time"><span class="t-no">' + esc(d.time || "") + '</span></td>'
        + '<td class="c-when"><span class="t-when">' + (TIME_SLOTS[i] || "") + '</span></td>'
        + '<td><button class="ro-cell" data-slot="' + esc(d.time || "") + '" data-booth="' + esc(d.booth || "") + '">'
        +   '<span class="t-subj">' + esc(d.booth || "") + '</span>'
        +   (d.room ? '<span class="t-room"><img class="t-pin" src="img/pin.png" alt="" aria-hidden="true">' + esc(d.room) + '</span>' : "")
        +   '<span class="ro-go">출석부 ›</span>'
        + '</button></td></tr>';
    }).join("");
    $("detailBody").innerHTML = head
      + '<p class="tt-note">선생님이 <b>감독(임장)</b>할 타임과 부스·교실이에요. 과목을 누르면 <b>학생 출석부</b>를 볼 수 있어요.</p>'
      + '<table class="tt-table"><thead><tr><th class="c-time">타임</th><th class="c-when">시간</th><th>감독 부스 · 교실</th></tr></thead><tbody>'
      + rows + '</tbody></table>';
    var dutyTbl = $("detailBody").querySelector(".tt-table");
    if (dutyTbl) dutyTbl.addEventListener("click", function (e) {
      var c = e.target.closest(".ro-cell"); if (!c) return;
      var booth = c.dataset.booth, slot = c.dataset.slot;
      openRoster(gradeOfBooth(booth, slot), slot, booth, renderDuty);
    });
  }

  /* ---------- 부스 출석부 (과목 클릭 → 하위 페이지) ----------
     (학년·타임·과목) 으로 그 부스를 듣는 학생을 모아 학년/반/번호/이름 순 정렬.
     인쇄 버튼으로 출석부를 바로 출력. */
  function banOf(cls) { var p = String(cls || "").split("-"); return parseInt(p[1], 10) || 0; }
  function gradeOfBooth(booth, slot) {
    var g1 = (window.ROOMS_G1 || {})[booth], g2 = (window.ROOMS_G2 || {})[booth];
    if (g1 && (!slot || g1[slot])) return "1";
    if (g2 && (!slot || g2[slot])) return "2";
    if (g1) return "1"; if (g2) return "2"; return "1";
  }
  function roomOf(grade, slot, subject) {
    var R = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};
    return (R[subject] || {})[slot] || "";
  }
  function rosterStudents(grade, slot, subject) {
    var ds = datasetFor(grade) || {}, idx = SLOT_ORDER[slot], list = [];
    for (var hak in ds) {
      var r = ds[hak];
      if (r && (r.slots || [])[idx] === subject)
        list.push({ grade: grade, ban: banOf(r.cls), no: r.no, name: r.name });
    }
    list.sort(function (a, b) {
      if (a.ban !== b.ban) return a.ban - b.ban;
      if (a.no !== b.no) return a.no - b.no;
      return String(a.name).localeCompare(String(b.name), "ko");
    });
    return list;
  }

  function openRoster(grade, slot, subject, backFn) {
    var idx = SLOT_ORDER[slot], when = TIME_SLOTS[idx] || "", room = roomOf(grade, slot, subject);
    var studs = rosterStudents(grade, slot, subject);
    $("detailTitle").textContent = "출석부";
    var body = studs.length
      ? studs.map(function (s) {
          return '<tr><td>' + s.grade + '</td><td>' + s.ban + '</td><td>' + s.no
            + '</td><td class="ro-nm">' + esc(s.name) + '</td><td class="ro-chk"></td></tr>';
        }).join("")
      : '<tr><td colspan="5" class="ro-empty">이 타임에 이 과목을 듣는 학생이 없어요.</td></tr>';
    $("detailBody").innerHTML = ''
      + '<div class="ro-top">'
      +   '<button class="ro-back" id="roBack">‹ 돌아가기</button>'
      +   '<button class="ro-print" id="roPrint"><img class="btn-ic" src="img/print.png" alt="" aria-hidden="true">출석부 인쇄</button>'
      + '</div>'
      + '<div class="ro-info"><div class="ro-subj">' + esc(subject) + '</div>'
      +   '<div class="ro-meta">' + grade + '학년 · ' + esc(slot) + '타임 ' + esc(when)
      +     (room ? ' · ' + esc(room) : "") + ' · 총 <b>' + studs.length + '</b>명</div></div>'
      + '<table class="tt-table ro-table"><thead><tr>'
      +   '<th>학년</th><th>반</th><th>번호</th><th>이름</th><th>확인</th>'
      + '</tr></thead><tbody>' + body + '</tbody></table>';
    $("roBack").addEventListener("click", function () { if (backFn) backFn(); });
    $("roPrint").addEventListener("click", function () { printRoster(grade, slot, subject, studs, when, room); });
    show("detail");
  }

  function printRoster(grade, slot, subject, studs, when, room) {
    var rows = studs.length
      ? studs.map(function (s) {
          return '<tr><td>' + s.grade + '</td><td>' + s.ban + '</td><td>' + s.no
            + '</td><td class="nm">' + esc(s.name) + '</td><td></td></tr>';
        }).join("")
      : '<tr><td colspan="5">학생 없음</td></tr>';
    var html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>출석부 - ' + esc(subject) + '</title>'
      + '<style>'
      + '*{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;box-sizing:border-box;}'
      + 'body{margin:22px;color:#111;}h1{font-size:18px;margin:0 0 4px;}'
      + '.sub{font-size:13px;color:#444;margin:0 0 14px;}'
      + 'table{width:100%;border-collapse:collapse;}'
      + 'th,td{border:1px solid #777;padding:7px 8px;font-size:13px;text-align:center;}'
      + 'th{background:#eee;}td.nm{text-align:left;}td:last-child{width:96px;}'
      + '</style></head><body>'
      + '<h1>2026 속초여고 교육과정 박람회 · 출석부</h1>'
      + '<p class="sub">' + esc(subject) + '  |  ' + grade + '학년 ' + esc(slot) + '타임 ' + esc(when)
      +   (room ? '  |  ' + esc(room) : "") + '  |  총 ' + studs.length + '명</p>'
      + '<table><thead><tr><th>학년</th><th>반</th><th>번호</th><th>이름</th><th>확인</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>'
      + '<scr' + 'ipt>window.onload=function(){window.print();}</scr' + 'ipt>'
      + '</body></html>';
    var w = window.open("", "_blank");
    if (!w) { alert("팝업이 차단되었어요. 팝업 허용 후 다시 시도해 주세요."); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ---------- (담임) 우리반 학생 타임별 위치 ----------
     담임(homeroom 101~309) → 반 학생 명렬 × A~N 타임 = 이동 교실 행렬 */
  function renderMyClass() {
    var name = localStorage.getItem(KEY.name) || "";
    var t = findTeacher(name);
    if (!t || !t.homeroom) {
      $("detailBody").innerHTML = '<div class="sv-none">담임 학급 정보가 없어요.</div>';
      return;
    }
    var hr = String(t.homeroom);
    var grade = hr.charAt(0);
    var ban = parseInt(hr.slice(1), 10);
    var cls = grade + "-" + ban;
    var ds = datasetFor(grade) || {};
    var ROOMS = (grade === "2" ? window.ROOMS_G2 : window.ROOMS_G1) || {};

    var studs = [];
    for (var hak in ds) {
      var r = ds[hak];
      if (r && r.cls === cls) studs.push({ no: r.no, name: r.name, slots: r.slots || [] });
    }
    studs.sort(function (a, b) { return a.no - b.no; });
    if (!studs.length) {
      $("detailBody").innerHTML = '<div class="sv-none">' + esc(cls) + '반 학생 데이터를 찾을 수 없어요.</div>';
      return;
    }

    var thTimes = "";
    for (var i = 0; i < SLOT_COUNT; i++) thTimes += '<th>' + SLOT_LETTERS[i] + '<span class="mc-when">' + (TIME_SLOTS[i] || "") + '</span></th>';
    var body = studs.map(function (s) {
      var tds = "";
      for (var j = 0; j < SLOT_COUNT; j++) {
        var subj = s.slots[j] || "";
        var room = (ROOMS[subj] || {})[SLOT_LETTERS[j]] || "";
        tds += '<td>'
          + (room ? '<span class="mc-room">' + esc(room) + '</span>' : "")
          + (subj ? '<span class="mc-subj">' + esc(subj) + '</span>' : '<span class="mc-empty">·</span>')
          + '</td>';
      }
      return '<tr><th class="mc-stu"><span class="mc-no">' + s.no + '</span><span class="mc-nm">' + esc(s.name) + '</span></th>' + tds + '</tr>';
    }).join("");

    var tableHtml = '<div class="mc-wrap"><table class="mc-table"><thead><tr><th class="mc-corner">번호·이름</th>'
      + thTimes + '</tr></thead><tbody>' + body + '</tbody></table></div>';

    $("detailBody").innerHTML = ''
      + '<div class="mc-head">'
      +   '<p class="tt-note mc-note"><b>' + esc(cls) + '반</b> 학생들이 타임별로 이동하는 <b>부스·교실</b>이에요. (총 ' + studs.length + '명)</p>'
      +   '<div class="mc-acts">'
      +     '<button class="mc-print mc-xlsx" id="mcXlsx"><img class="btn-ic" src="img/excel.png" alt="" aria-hidden="true">엑셀</button>'
      +     '<button class="mc-print" id="mcPrint"><img class="btn-ic" src="img/print.png" alt="" aria-hidden="true">인쇄</button>'
      +   '</div>'
      + '</div>'
      + tableHtml;

    $("mcPrint").addEventListener("click", function () {
      openPrintWindow(esc(cls) + "반 학생 타임별 위치 (총 " + studs.length + "명)", tableHtml);
    });
    $("mcXlsx").addEventListener("click", function () {
      var header = ["번호", "이름"];
      for (var k = 0; k < SLOT_COUNT; k++) header.push(SLOT_LETTERS[k] + " (" + (TIME_SLOTS[k] || "") + ")");
      var rows = [header];
      studs.forEach(function (s) {
        var row = [s.no, s.name];
        for (var k = 0; k < SLOT_COUNT; k++) {
          var subj = s.slots[k] || "";
          var room = (ROOMS[subj] || {})[SLOT_LETTERS[k]] || "";
          row.push(subj ? (room ? room + " / " + subj : subj) : "");
        }
        rows.push(row);
      });
      downloadCsv(cls + "반_학생_타임별_위치.csv", rows);
    });
  }

  // 2차원 배열 → CSV(엑셀, UTF-8 BOM) 다운로드
  function downloadCsv(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (c) {
        c = (c == null) ? "" : String(c);
        return /[",\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(",");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 인쇄용 새 창 (가로 방향) ---------- */
  function openPrintWindow(title, innerHtml) {
    var w = window.open("", "_blank");
    if (!w) { alert("팝업이 차단되어 인쇄 창을 열 수 없어요. 브라우저의 팝업 허용 후 다시 시도해 주세요."); return; }
    var css = ''
      + '@page{size:A4 landscape;margin:9mm;}'
      + '*{box-sizing:border-box;}'
      + 'body{font-family:"Pretendard","Malgun Gothic",sans-serif;margin:0;padding:14px;color:#1c1c1c;}'
      + 'h2{font-size:15px;margin:0 0 10px;}'
      + '.mc-wrap{overflow:visible;border:0;box-shadow:none;}'
      + 'table{border-collapse:collapse;width:100%;table-layout:fixed;}'
      + 'th,td{border:1px solid #444;padding:3px 4px;text-align:center;vertical-align:middle;'
      +   'font-size:9.5px;width:14.2857%;word-break:keep-all;overflow:hidden;}'
      + 'thead th{background:#B5476B !important;color:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
      + 'thead th .mc-when{display:block;font-size:7.5px;font-weight:400;margin-top:1px;}'
      + 'tbody th{background:#FBEAF0 !important;text-align:left;padding-left:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
      + 'tbody th .mc-no{color:#999;margin-right:4px;}'
      + 'tbody th .mc-nm{font-weight:700;}'
      + '.mc-room{display:block;font-weight:700;color:#9C3F61;font-size:9.5px;}'
      + '.mc-subj{display:block;font-size:7.5px;color:#666;margin-top:1px;line-height:1.2;}'
      + '.mc-empty{color:#bbb;}'
      + 'tbody tr:nth-child(even) td{background:#FDF7F9;-webkit-print-color-adjust:exact;print-color-adjust:exact;}';
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
      + '<title>' + title + '</title><style>' + css + '</style></head><body>'
      + '<h2>' + title + '</h2>' + innerHtml
      + '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},250);};</scr' + 'ipt>'
      + '</body></html>');
    w.document.close();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 히어로 박스 (학생=나의 시간표 / 교사=전체 일정)
  $("heroTimetable").addEventListener("click", function () { handleGo(this.dataset.go || "timetable"); });

  /* ---------- MY PAGE (내 정보 + 로그아웃) ---------- */
  function logout() {
    localStorage.removeItem(KEY.name);
    localStorage.removeItem(KEY.hak);
    localStorage.removeItem(KEY.grade);
    selectedGrade = null;
    // 랜딩 초기 상태로 복귀
    $("lpLogin").hidden = true;
    $("lpTeacher").hidden = true;
    $("lpGrades").hidden = false;
    $("lpHak").value = "";
    $("lpName").value = "";
    $("lpTName").value = "";
    $("lpCode").value = "";
    clearErr();
    show("landing");
  }

  function renderMyPage() {
    var hak   = localStorage.getItem(KEY.hak) || "";
    var grade = localStorage.getItem(KEY.grade) || "";
    var name  = localStorage.getItem(KEY.name) || "속초여고 학생";
    var ds    = datasetFor(grade);
    var rec   = (ds && ds[hak]) ? ds[hak] : null;

    var rows;
    if (grade === "T") {                       // 교사
      var t = findTeacher(name) || {};
      rows = '<div class="mp-row"><span class="mp-k">이름</span><span class="mp-v">' + esc(name) + '</span></div>'
        + '<div class="mp-row"><span class="mp-k">구분</span><span class="mp-v">교사</span></div>'
        + (t.subject  ? '<div class="mp-row"><span class="mp-k">담당</span><span class="mp-v">' + esc(t.subject) + '</span></div>' : "")
        + (t.homeroom ? '<div class="mp-row"><span class="mp-k">담임</span><span class="mp-v">' + esc(t.homeroom) + '호실</span></div>' : "");
    } else {
      rows = '<div class="mp-row"><span class="mp-k">이름</span><span class="mp-v">' + esc(name) + '</span></div>'
        + (grade ? '<div class="mp-row"><span class="mp-k">학년</span><span class="mp-v">' + esc(grade) + '학년</span></div>' : "")
        + (rec   ? '<div class="mp-row"><span class="mp-k">학반</span><span class="mp-v">' + esc(rec.cls) + ' · ' + rec.no + '번</span></div>' : "")
        + (hak   ? '<div class="mp-row"><span class="mp-k">학번</span><span class="mp-v">' + esc(hak) + '</span></div>' : "");
    }

    $("detailBody").innerHTML = ''
      + '<div class="mp">'
      +   '<img class="mp-char" src="' + pickChar(name) + '" alt="" onerror="this.style.display=\'none\'">'
      +   '<div class="mp-name">' + esc(name) + honorific(name) + '</div>'
      +   '<div class="mp-card">' + rows + '</div>'
      +   '<button class="mp-logout" id="logoutBtn">로그아웃</button>'
      + '</div>';
    $("logoutBtn").addEventListener("click", logout);
  }

  // 상단 MY PAGE / 알림
  $("goMy").addEventListener("click", function () {
    $("detailTitle").textContent = "MY PAGE"; renderMyPage(); show("detail");
  });
  $("goAlarm").addEventListener("click", function () {
    $("detailTitle").textContent = "알림"; renderSoon(); show("detail");
  });

  /* ---------- 6) 초기 진입 ---------- */
  var savedName = localStorage.getItem(KEY.name);
  if (savedName) enterHome(savedName);
  else show("landing");
})();
