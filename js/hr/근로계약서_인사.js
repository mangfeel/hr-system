/**
 * 근로계약서_인사.js - 근로계약서 생성 모듈
 * 
 * 직원별 근로계약서 생성 및 인쇄 기능
 * - 호봉제 / 연봉제 / 연봉제(단시간) 서식
 * - 정규직 / 계약직 계약기간 구분
 * - 조직 설정 연동 (기관명, 주소, 연락처, 퇴직연금)
 * - 최고관리자 정보 동적 조회
 * - 수습기간 설정 (호봉제/연봉제 모두 가능)
 * - 월소정근로시간 자동 계산
 * - 검색 + 체크박스 테이블 UI
 * - 다중 선택 일괄 인쇄
 * - 업무 내용 미리보기 편집 기능
 * - 미리보기에서 조항 직접 편집 기능
 * - 추가 수당 등록/삭제 기능
 * - 추가 조항 등록/삭제 기능
 * 
 * @version 5.3.0
 * @since 2025-12-09
 * @location js/hr/근로계약서_인사.js
 * 
 * [변경 이력]
 * v5.3.0 (2026-02-04) ⭐ 추가 조항 기능
 * - 기타 조항에 추가 조항 등록 가능
 * - 추가 조항 삭제 기능 (X 버튼)
 * - 조항 내용 편집 가능
 * - 호봉제/연봉제/연봉제(단시간) 3개 서식 모두 적용
 * - 인쇄 시 추가/삭제 버튼 자동 숨김
 *
 * v5.2.0 (2026-02-04) ⭐ 추가 수당 기능
 * - 기본 수당 외 추가 수당 등록 가능
 * - 추가 수당 삭제 기능 (X 버튼)
 * - 수당명/금액 편집 가능
 * - 호봉제/연봉제/연봉제(단시간) 3개 서식 모두 적용
 * - 인쇄 시 추가/삭제 버튼 자동 숨김
 *
 * v5.1.0 (2026-02-04) ⭐ 미리보기 편집 기능 확장
 * - 주근무장소: 미리보기에서 편집 가능 (contenteditable)
 * - 근무일/휴일: 미리보기에서 편집 가능 (contenteditable)
 * - 가족수당: 미리보기에서 편집 가능 (contenteditable)
 * - 호봉제/연봉제/연봉제(단시간) 3개 서식 모두 적용
 *
 * v5.0.0 (2026-01-22) ⭐ API 전용 버전
 * - 호봉 계산에서 저장된 값 사용 (getDynamicRankInfo가 async)
 * - 모든 계산 로직 서버 API로 이동
 *
 * v3.6 - 휴게시간 설정 범위 확장 (2026-01-13)
 * - 휴게시간 선택 범위: 11시~16시 → 9시~21시로 확장
 * - 호봉제/연봉제 탭 모두 적용
 * v3.5 - 연봉제/연봉제(단시간) 서식 생성 오류 수정 (2026-01-07)
 * - _generateSalaryContractHTML: employee 변수 destructuring 누락 수정
 * - _generateSalaryPartTimeContractHTML: employee 변수 destructuring 누락 수정
 * - 미리보기/인쇄 시 "ReferenceError: employee is not defined" 오류 해결
 * v3.4 - 업무 내용 편집 기능 추가 (2025-12-12)
 * - 미리보기에서 "업무의 내용" 직접 수정 가능 (contenteditable)
 * - 수정된 값은 메모리에 저장되어 선택 인쇄 시 반영
 * - 기관별 맞춤 업무 내용 출력 가능
 * v3.3 - 근로개시일/수습기간 날짜 누락 버그 수정 (2025-12-11)
 * - v3.0에서 UI 변경 시 날짜 입력 필드가 제거됨
 * - DOM 조회 → 직원 데이터에서 직접 조회로 변경
 * - hireDate: employee.employment?.entryDate || employee.hireDate
 * - contractStart/End: 직원 데이터 또는 해당 연도 기본값
 * - 호봉제/연봉제 탭에 출근/퇴근/휴게시간 설정 기능 추가 (탄력근무 지원)
 * v3.2 - 신규입사자 승급 정보 표시 개선 (2025-12-10)
 * - 계약년도 내 승급 없는 경우: 기본급 + 첫 승급 예정일 표시
 * - 계약년도 내 승급 있는 경우: 기존 방식 유지 (호봉 변경 정보)
 * v3.1 - 신규직원 목록 누락 버그 수정 (2025-12-10)
 * - _isRankBasedAtDate: 다중 폴백 패턴 적용 (rank.isRankBased → employment.isRankBased)
 * - _getContractType: 동일 패턴 적용
 * - assignments 필드 폴백 (effectiveDate → date)
 * v3.0 - UI 대폭 개선 (2025-12-09)
 * - 검색 + 체크박스 테이블 방식
 * - 다중 선택 및 일괄 인쇄
 * - 전체 선택/해제
 * v2.0 - 원본 서식 반영 (2025-12-09)
 * - 근로계약서_서식_v2.html 기반 서식 적용
 * v1.0 - 초기 버전 (2025-12-09)
 * 
 * [서식 분류]
 * - 호봉제: isRankBased === true (인건비 가이드라인 + 호봉)
 * - 연봉제: isRankBased === false && 주 40시간 (월 고정급)
 * - 연봉제(단시간): isRankBased === false && 주 40시간 미만
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 초기화_인사.js (getTopManagerInfo)
 * - 근로계약서_스타일.css (외부 스타일)
 */

// ===== 상태 관리 =====
let _currentContractTab = 'rank';
let _selectedEmployees = { rank: new Set(), salary: new Set(), 'salary-parttime': new Set() };
let _employeeListCache = { rank: [], salary: [], 'salary-parttime': [] };
let _currentPreviewIndex = 0;  // 현재 미리보기 인덱스
let _customJobDescriptions = {};  // ⭐ 직원별 수정된 업무 내용 저장 (empId -> jobDescription)
let _customContractFields = {};   // ⭐ 직원별 수정된 계약서 필드 저장 (empId -> { workPlace, workDays, familyAllowance })
let _customAllowances = {};       // ⭐ 직원별 추가 수당 저장 (empId -> [{ name, value }])
let _customClauses = {};          // ⭐ 직원별 추가 조항 저장 (empId -> [{ id, content }])

// 기본값 상수
const _defaultContractFields = {
    workPlace: '사용자내 또는 "사용자가" 지시하는 장소(단, 업무상 필요시 조정 가능)',
    workDays: '매주 5일근무(월~금), 주휴일 매주 일요일',
    familyAllowance: '사회복지시설 종사자 수당 기준'
};
// ===== 모듈 초기화 =====

/**
 * 근로계약서 모듈 초기화
 */
function loadEmploymentContractModule() {
    try {
        로거_인사?.debug('근로계약서 모듈 초기화');
        
 // ⭐ UI 스타일 주입
        _injectContractStyles();
        
 // ⭐ 기준일에 오늘 날짜 설정
        const today = new Date().toISOString().split('T')[0];
        const baseDateEl = document.getElementById('contractBaseDate');
        if (baseDateEl) baseDateEl.value = today;
        
 // ⭐ 전체 탭 UI 재구성
        _rebuildAllTabsUI();
        
 // ⭐ 직원 목록 로드
        _loadAllEmployeeLists();
        
 // 초기 미리보기 숨기기
        const previewContainer = document.getElementById('contractPreviewContainer');
        if (previewContainer) previewContainer.innerHTML = '';
        
        로거_인사?.info('근로계약서 모듈 초기화 완료 (v3.3)');
        
    } catch (error) {
        로거_인사?.error('근로계약서 모듈 초기화 오류', error);
        에러처리_인사?.handle(error, '근로계약서 모듈 초기화 중 오류가 발생했습니다.');
    }
}

/**
 * UI 스타일 주입
 */
function _injectContractStyles() {
    if (document.getElementById('contract-custom-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'contract-custom-styles';
    style.textContent = `
 /* ===== 탭 버튼 균등 배치 ===== */
        .contract-tabs {
            display: flex !important;
            gap: 0 !important;
            margin-bottom: 15px !important;
            border-bottom: 2px solid #e5e7eb !important;
        }
        
        .contract-tabs .contract-tab-btn {
            flex: 1 !important;
            text-align: center !important;
            padding: 12px 16px !important;
            border: none !important;
            background: #f9fafb !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            color: #6b7280 !important;
            border-bottom: 3px solid transparent !important;
            transition: all 0.2s !important;
            margin-bottom: -2px !important;
        }
        
        .contract-tabs .contract-tab-btn:hover {
            background: #f3f4f6 !important;
            color: #374151 !important;
        }
        
        .contract-tabs .contract-tab-btn.active {
            background: white !important;
            color: #2563eb !important;
            border-bottom-color: #2563eb !important;
        }
        
        .contract-tabs .contract-tab-btn span {
            margin-left: 6px !important;
            padding: 2px 8px !important;
            border-radius: 10px !important;
            font-size: 11px !important;
        }
        
        .contract-tabs .contract-tab-btn.active span {
            background: #2563eb !important;
            color: white !important;
        }
        
        .contract-tabs .contract-tab-btn:not(.active) span {
            background: #d1d5db !important;
            color: white !important;
        }
        
 /* ===== 검색 바 ===== */
        .contract-search-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            padding: 10px 12px;
            background: #f8fafc;
            border-radius: 8px;
        }
        
        .contract-search-bar input[type="text"] {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
            outline: none;
        }
        
        .contract-search-bar input[type="text"]:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
        
        .contract-search-bar .select-all-group {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #374151;
            white-space: nowrap;
        }
        
 /* ===== 직원 테이블 ===== */
        .contract-employee-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 12px;
        }
        
        .contract-employee-table th {
            background: #f1f5f9;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
            position: sticky;
            top: 0;
        }
        
        .contract-employee-table th:first-child {
            width: 40px;
            text-align: center;
        }
        
        .contract-employee-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }
        
        .contract-employee-table td:first-child {
            text-align: center;
        }
        
        .contract-employee-table tbody tr:hover {
            background: #f8fafc;
        }
        
        .contract-employee-table tbody tr.selected {
            background: #eff6ff;
        }
        
        .contract-employee-table input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        .contract-table-container {
            max-height: 280px;
            overflow-y: auto;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        
 /* ===== 선택 정보 & 버튼 영역 ===== */
        .contract-action-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .contract-selection-info {
            font-size: 13px;
            color: #64748b;
        }
        
        .contract-selection-info strong {
            color: #2563eb;
            font-size: 15px;
        }
        
        .contract-action-buttons {
            display: flex;
            gap: 8px;
        }
        
        .contract-action-buttons button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-preview {
            background: #f1f5f9;
            color: #475569;
        }
        
        .btn-preview:hover {
            background: #e2e8f0;
        }
        
        .btn-print {
            background: #2563eb;
            color: white;
        }
        
        .btn-print:hover {
            background: #1d4ed8;
        }
        
        .btn-print:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
        }
        
 /* ===== 단시간 전용: 시간 설정 ===== */
        .parttime-settings {
            display: flex;
            gap: 15px;
            padding: 12px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        
        .parttime-settings.break-time {
            background: #fefce8;
            border-color: #fde047;
        }
        
        .time-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .time-group-label {
            font-size: 12px;
            font-weight: 600;
            color: #166534;
            min-width: 60px;
        }
        
        .parttime-settings.break-time .time-group-label {
            color: #854d0e;
        }
        
        .time-group select {
            padding: 5px 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .time-group .separator {
            color: #9ca3af;
        }
        
        .no-break-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
        }
        
 /* ===== 수습기간 옵션 ===== */
        .probation-options {
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 12px;
        }
        
        .probation-options .form-row {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .probation-options label {
            font-size: 13px;
            color: #374151;
        }
        
        .probation-options select {
            padding: 6px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * 전체 탭 UI 재구성
 */
function _rebuildAllTabsUI() {
 // 기존 탭 버튼에 단시간 추가
    _addSalaryPartTimeTabButton();
    
 // 호봉제 탭 재구성
    _rebuildTabContent('rank', 'contractTabRank', '호봉제');
    
 // 연봉제 탭 재구성
    _rebuildTabContent('salary', 'contractTabSalary', '연봉제');
    
 // 단시간 탭 생성
    _createSalaryPartTimeTab();
}

/**
 * 단시간 탭 버튼 추가
 */
function _addSalaryPartTimeTabButton() {
    const tabsContainer = document.querySelector('.contract-tabs');
    if (!tabsContainer || document.querySelector('[data-tab="salary-parttime"]')) return;
    
    const partTimeBtn = document.createElement('button');
    partTimeBtn.type = 'button';
    partTimeBtn.className = 'contract-tab-btn';
    partTimeBtn.dataset.tab = 'salary-parttime';
    partTimeBtn.onclick = () => switchContractTab('salary-parttime');
    partTimeBtn.innerHTML = `⏰ 연봉제(단시간) <span id="contractSalaryPartTimeCount">0</span>`;
    tabsContainer.appendChild(partTimeBtn);
}

/**
 * 탭 컨텐츠 재구성 (호봉제/연봉제)
 */
function _rebuildTabContent(tabType, tabId, tabName) {
    const tabEl = document.getElementById(tabId);
    if (!tabEl) return;
    
    const suffix = tabType === 'rank' ? 'Rank' : 'Salary';
    
    tabEl.innerHTML = `
        <!-- 검색 바 -->
        <div class="contract-search-bar">
            <input type="text" id="contractSearch${suffix}" placeholder="이름, 부서, 직위로 검색..." oninput="_filterEmployeeTable('${tabType}')">
            <label class="select-all-group">
                <input type="checkbox" id="contractSelectAll${suffix}" onchange="_toggleSelectAll('${tabType}')">
                전체선택
            </label>
        </div>
        
        <!-- 직원 테이블 -->
        <div class="contract-table-container">
            <table class="contract-employee-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="contractSelectAllHeader${suffix}" onchange="_toggleSelectAll('${tabType}')"></th>
                        <th>이름</th>
                        <th>부서</th>
                        <th>직위</th>
                    </tr>
                </thead>
                <tbody id="contractTableBody${suffix}">
                    <!-- 동적 생성 -->
                </tbody>
            </table>
        </div>
        
        <!-- 선택 정보 & 버튼 -->
        <div class="contract-action-bar">
            <div class="contract-selection-info">
                선택: <strong id="contractSelectedCount${suffix}">0</strong>명 / 
                전체: <span id="contractTotalCount${suffix}">0</span>명
            </div>
            <div class="contract-action-buttons">
                <button type="button" class="btn-preview" onclick="_previewFirstSelected('${tabType}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 미리보기</button>
                <button type="button" class="btn-print" id="contractPrintBtn${suffix}" onclick="_printSelectedEmployees('${tabType}')" disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 선택 인쇄</button>
            </div>
        </div>
        
        <!-- 수습기간 옵션 -->
        <div class="probation-options">
            <div class="form-row">
                <label>
                    <input type="checkbox" id="contractHasProbation${suffix}" onchange="_onProbationChange('${tabType}')">
                    수습기간 적용
                </label>
                <select id="contractProbationMonths${suffix}" style="display: none;" onchange="_updatePreviewIfSelected()">
                    <option value="1">1개월</option>
                    <option value="2">2개월</option>
                    <option value="3" selected>3개월</option>
                </select>
            </div>
        </div>
        
        <!-- 근무시간 설정 -->
        <div class="parttime-settings">
            <div class="time-group">
                <span class="time-group-label">⏱️ 출근</span>
                <select id="contractStartHour${suffix}" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 6).map(h => `<option value="${h}" ${h === 9 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractStartMin${suffix}" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
            <span class="separator">~</span>
            <div class="time-group">
                <span class="time-group-label">퇴근</span>
                <select id="contractEndHour${suffix}" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 10).map(h => `<option value="${h}" ${h === 18 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractEndMin${suffix}" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
        </div>
        
        <!-- 휴게시간 설정 -->
        <div class="parttime-settings break-time">
            <div class="time-group">
                <span class="time-group-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> 휴게</span>
                <select id="contractBreakStartHour${suffix}" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 9).map(h => `<option value="${h}" ${h === 12 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractBreakStartMin${suffix}" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
            <span class="separator">~</span>
            <div class="time-group">
                <select id="contractBreakEndHour${suffix}" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 9).map(h => `<option value="${h}" ${h === 13 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractBreakEndMin${suffix}" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
            <label class="no-break-label">
                <input type="checkbox" id="contractNoBreak${suffix}" onchange="_toggleBreakTimeByTab('${tabType}')">
                휴게없음
            </label>
        </div>
    `;
}

/**
 * 연봉제(단시간) 탭 생성
 */
function _createSalaryPartTimeTab() {
    const salaryTab = document.getElementById('contractTabSalary');
    if (!salaryTab || document.getElementById('contractTabSalaryPartTime')) return;
    
    const partTimeTab = document.createElement('div');
    partTimeTab.id = 'contractTabSalaryPartTime';
    partTimeTab.className = 'contract-tab-content';
    partTimeTab.style.display = 'none';
    
    partTimeTab.innerHTML = `
        <!-- 검색 바 -->
        <div class="contract-search-bar">
            <input type="text" id="contractSearchSalaryPartTime" placeholder="이름, 부서, 직위로 검색..." oninput="_filterEmployeeTable('salary-parttime')">
            <label class="select-all-group">
                <input type="checkbox" id="contractSelectAllSalaryPartTime" onchange="_toggleSelectAll('salary-parttime')">
                전체선택
            </label>
        </div>
        
        <!-- 직원 테이블 (주당근무시간 포함) -->
        <div class="contract-table-container">
            <table class="contract-employee-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="contractSelectAllHeaderSalaryPartTime" onchange="_toggleSelectAll('salary-parttime')"></th>
                        <th>이름</th>
                        <th>부서</th>
                        <th>직위</th>
                        <th>주당근무</th>
                    </tr>
                </thead>
                <tbody id="contractTableBodySalaryPartTime">
                    <!-- 동적 생성 -->
                </tbody>
            </table>
        </div>
        
        <!-- 선택 정보 & 버튼 -->
        <div class="contract-action-bar">
            <div class="contract-selection-info">
                선택: <strong id="contractSelectedCountSalaryPartTime">0</strong>명 / 
                전체: <span id="contractTotalCountSalaryPartTime">0</span>명
            </div>
            <div class="contract-action-buttons">
                <button type="button" class="btn-preview" onclick="_previewFirstSelected('salary-parttime')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> 미리보기</button>
                <button type="button" class="btn-print" id="contractPrintBtnSalaryPartTime" onclick="_printSelectedEmployees('salary-parttime')" disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 선택 인쇄</button>
            </div>
        </div>
        
        <!-- 근무시간 설정 -->
        <div class="parttime-settings">
            <div class="time-group">
                <span class="time-group-label">⏱️ 출근</span>
                <select id="contractStartHour" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 6).map(h => `<option value="${h}" ${h === 10 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractStartMin" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
            <span class="separator">~</span>
            <div class="time-group">
                <span class="time-group-label">퇴근</span>
                <select id="contractEndHour" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 10).map(h => `<option value="${h}" ${h === 15 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractEndMin" onchange="_updatePreviewIfSelected()">
                    <option value="0">00분</option>
                    <option value="30" selected>30분</option>
                </select>
            </div>
        </div>
        
        <!-- 휴게시간 설정 -->
        <div class="parttime-settings break-time">
            <div class="time-group">
                <span class="time-group-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> 휴게</span>
                <select id="contractBreakStartHour" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 9).map(h => `<option value="${h}" ${h === 12 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractBreakStartMin" onchange="_updatePreviewIfSelected()">
                    <option value="0">00분</option>
                    <option value="30" selected>30분</option>
                </select>
            </div>
            <span class="separator">~</span>
            <div class="time-group">
                <select id="contractBreakEndHour" onchange="_updatePreviewIfSelected()">
                    ${Array.from({length: 13}, (_, i) => i + 9).map(h => `<option value="${h}" ${h === 13 ? 'selected' : ''}>${h}시</option>`).join('')}
                </select>
                <select id="contractBreakEndMin" onchange="_updatePreviewIfSelected()">
                    <option value="0" selected>00분</option>
                    <option value="30">30분</option>
                </select>
            </div>
            <label class="no-break-label">
                <input type="checkbox" id="contractNoBreak" onchange="_toggleBreakTime()">
                휴게없음
            </label>
        </div>
        
        <!-- 수습기간 옵션 -->
        <div class="probation-options">
            <div class="form-row">
                <label>
                    <input type="checkbox" id="contractHasProbationSalaryPartTime" onchange="_onProbationChange('salary-parttime')">
                    수습기간 적용
                </label>
                <select id="contractProbationMonthsSalaryPartTime" style="display: none;" onchange="_updatePreviewIfSelected()">
                    <option value="1">1개월</option>
                    <option value="2">2개월</option>
                    <option value="3" selected>3개월</option>
                </select>
            </div>
        </div>
    `;
    
    salaryTab.parentNode.insertBefore(partTimeTab, salaryTab.nextSibling);
}

// ===== 탭 전환 =====

function _getCurrentContractTab() {
    return _currentContractTab;
}

function switchContractTab(tabType) {
    _currentContractTab = tabType;
    _currentPreviewIndex = 0;  // 미리보기 인덱스 초기화
    
 // 탭 버튼 활성화
    document.querySelectorAll('.contract-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabType);
    });
    
 // 탭 컨텐츠 표시
    document.getElementById('contractTabRank').style.display = tabType === 'rank' ? 'block' : 'none';
    document.getElementById('contractTabSalary').style.display = tabType === 'salary' ? 'block' : 'none';
    const partTimeTab = document.getElementById('contractTabSalaryPartTime');
    if (partTimeTab) partTimeTab.style.display = tabType === 'salary-parttime' ? 'block' : 'none';
    
 // 미리보기 초기화
    const previewContainer = document.getElementById('contractPreviewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
}

// ===== 직원 목록 로드 =====

function _loadAllEmployeeLists() {
    const baseDate = document.getElementById('contractBaseDate')?.value || 
                     new Date().toISOString().split('T')[0];
    
    const employees = db.getEmployees();
    
 // 재직자 필터링
    const activeEmployees = employees.filter(emp => {
        const entryDate = emp.employment?.entryDate || emp.hireDate;
        const retireDate = emp.employment?.retirementDate || emp.resignationDate;
        if (entryDate && entryDate > baseDate) return false;
        if (retireDate && retireDate < baseDate) return false;
        return true;
    });
    
 // 호봉제/연봉제 분리
    const rankEmployees = activeEmployees.filter(emp => _isRankBasedAtDate(emp, baseDate));
    const allSalaryEmployees = activeEmployees.filter(emp => !_isRankBasedAtDate(emp, baseDate));
    
 // 연봉제를 전일제/단시간으로 분리
    const salaryEmployees = allSalaryEmployees.filter(emp => {
        const weeklyHours = emp.employment?.weeklyWorkingHours ?? 40;
        return weeklyHours >= 40;
    });
    const salaryPartTimeEmployees = allSalaryEmployees.filter(emp => {
        const weeklyHours = emp.employment?.weeklyWorkingHours ?? 40;
        return weeklyHours < 40;
    });
    
 // 이름순 정렬
    const sortByName = (a, b) => {
        const nameA = a.personalInfo?.name || '';
        const nameB = b.personalInfo?.name || '';
        return nameA.localeCompare(nameB, 'ko');
    };
    
    rankEmployees.sort(sortByName);
    salaryEmployees.sort(sortByName);
    salaryPartTimeEmployees.sort(sortByName);
    
 // 캐시 저장
    _employeeListCache.rank = rankEmployees;
    _employeeListCache.salary = salaryEmployees;
    _employeeListCache['salary-parttime'] = salaryPartTimeEmployees;
    
 // 선택 초기화
    _selectedEmployees.rank.clear();
    _selectedEmployees.salary.clear();
    _selectedEmployees['salary-parttime'].clear();
    
 // 테이블 렌더링
    _renderEmployeeTable('rank');
    _renderEmployeeTable('salary');
    _renderEmployeeTable('salary-parttime');
    
 // 탭 인원수 업데이트
    _updateTabCounts();
}

function _renderEmployeeTable(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const tbody = document.getElementById(`contractTableBody${suffix}`);
    if (!tbody) return;
    
    const employees = _employeeListCache[tabType] || [];
    const searchTerm = document.getElementById(`contractSearch${suffix}`)?.value?.toLowerCase() || '';
    
 // 검색 필터링
    const filteredEmployees = employees.filter(emp => {
        if (!searchTerm) return true;
        const name = emp.personalInfo?.name || '';
        const dept = emp.currentPosition?.dept || '';
        const position = emp.currentPosition?.position || '';
        return name.toLowerCase().includes(searchTerm) ||
               dept.toLowerCase().includes(searchTerm) ||
               position.toLowerCase().includes(searchTerm);
    });
    
 // 테이블 렌더링
    if (filteredEmployees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${tabType === 'salary-parttime' ? 5 : 4}" style="text-align: center; color: #9ca3af; padding: 30px;">직원이 없습니다</td></tr>`;
    } else {
        tbody.innerHTML = filteredEmployees.map(emp => {
            const isSelected = _selectedEmployees[tabType].has(emp.id);
            const weeklyHours = emp.employment?.weeklyWorkingHours ?? 40;
            
            return `
                <tr class="${isSelected ? 'selected' : ''}" onclick="_toggleEmployeeSelection('${tabType}', '${emp.id}', event)">
                    <td><input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); _toggleEmployeeSelection('${tabType}', '${emp.id}')"></td>
                    <td>${emp.personalInfo?.name || ''}</td>
                    <td>${emp.currentPosition?.dept || ''}</td>
                    <td>${emp.currentPosition?.position || ''}</td>
                    ${tabType === 'salary-parttime' ? `<td>${weeklyHours}시간</td>` : ''}
                </tr>
            `;
        }).join('');
    }
    
 // 전체 수 업데이트
    const totalCountEl = document.getElementById(`contractTotalCount${suffix}`);
    if (totalCountEl) totalCountEl.textContent = filteredEmployees.length;
    
    _updateSelectionInfo(tabType);
}

function _updateTabCounts() {
    const rankCount = document.getElementById('contractRankCount');
    const salaryCount = document.getElementById('contractSalaryCount');
    const partTimeCount = document.getElementById('contractSalaryPartTimeCount');
    
    if (rankCount) rankCount.textContent = _employeeListCache.rank.length;
    if (salaryCount) salaryCount.textContent = _employeeListCache.salary.length;
    if (partTimeCount) partTimeCount.textContent = _employeeListCache['salary-parttime'].length;
}

// ===== 검색 & 선택 =====

function _filterEmployeeTable(tabType) {
    _renderEmployeeTable(tabType);
}

function _toggleEmployeeSelection(tabType, empId, event) {
    if (event) event.stopPropagation();
    
    if (_selectedEmployees[tabType].has(empId)) {
        _selectedEmployees[tabType].delete(empId);
    } else {
        _selectedEmployees[tabType].add(empId);
    }
    
    _renderEmployeeTable(tabType);
    _updateSelectAllCheckbox(tabType);
}

function _toggleSelectAll(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const searchTerm = document.getElementById(`contractSearch${suffix}`)?.value?.toLowerCase() || '';
    
 // 현재 필터된 직원만
    const filteredEmployees = _employeeListCache[tabType].filter(emp => {
        if (!searchTerm) return true;
        const name = emp.personalInfo?.name || '';
        const dept = emp.currentPosition?.dept || '';
        const position = emp.currentPosition?.position || '';
        return name.toLowerCase().includes(searchTerm) ||
               dept.toLowerCase().includes(searchTerm) ||
               position.toLowerCase().includes(searchTerm);
    });
    
 // 전체 선택 여부 확인
    const allSelected = filteredEmployees.every(emp => _selectedEmployees[tabType].has(emp.id));
    
    if (allSelected) {
 // 모두 해제
        filteredEmployees.forEach(emp => _selectedEmployees[tabType].delete(emp.id));
    } else {
 // 모두 선택
        filteredEmployees.forEach(emp => _selectedEmployees[tabType].add(emp.id));
    }
    
    _renderEmployeeTable(tabType);
    _updateSelectAllCheckbox(tabType);
}

function _updateSelectAllCheckbox(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const searchTerm = document.getElementById(`contractSearch${suffix}`)?.value?.toLowerCase() || '';
    
    const filteredEmployees = _employeeListCache[tabType].filter(emp => {
        if (!searchTerm) return true;
        const name = emp.personalInfo?.name || '';
        const dept = emp.currentPosition?.dept || '';
        const position = emp.currentPosition?.position || '';
        return name.toLowerCase().includes(searchTerm) ||
               dept.toLowerCase().includes(searchTerm) ||
               position.toLowerCase().includes(searchTerm);
    });
    
    const allSelected = filteredEmployees.length > 0 && 
                        filteredEmployees.every(emp => _selectedEmployees[tabType].has(emp.id));
    
    const selectAllEl = document.getElementById(`contractSelectAll${suffix}`);
    const selectAllHeaderEl = document.getElementById(`contractSelectAllHeader${suffix}`);
    
    if (selectAllEl) selectAllEl.checked = allSelected;
    if (selectAllHeaderEl) selectAllHeaderEl.checked = allSelected;
}

function _updateSelectionInfo(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const count = _selectedEmployees[tabType].size;
    
    const countEl = document.getElementById(`contractSelectedCount${suffix}`);
    const printBtn = document.getElementById(`contractPrintBtn${suffix}`);
    
    if (countEl) countEl.textContent = count;
    if (printBtn) {
        printBtn.disabled = count === 0;
        printBtn.innerHTML = count > 0 ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 선택 인쇄 (${count}명)` : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 선택 인쇄';
    }
}

// ===== 수습기간 =====

function _onProbationChange(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const checkbox = document.getElementById(`contractHasProbation${suffix}`);
    const select = document.getElementById(`contractProbationMonths${suffix}`);
    
    if (select) select.style.display = checkbox?.checked ? 'inline-block' : 'none';
    
    _updatePreviewIfSelected();
}

// ===== 휴게시간 토글 =====

/**
 * 탭별 휴게시간 토글 (호봉제/연봉제용)
 */
function _toggleBreakTimeByTab(tabType) {
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const noBreak = document.getElementById(`contractNoBreak${suffix}`)?.checked;
    
    const breakStartHour = document.getElementById(`contractBreakStartHour${suffix}`);
    const breakStartMin = document.getElementById(`contractBreakStartMin${suffix}`);
    const breakEndHour = document.getElementById(`contractBreakEndHour${suffix}`);
    const breakEndMin = document.getElementById(`contractBreakEndMin${suffix}`);
    
    [breakStartHour, breakStartMin, breakEndHour, breakEndMin].forEach(el => {
        if (el) el.disabled = noBreak;
    });
    
    _updatePreviewIfSelected();
}

/**
 * 휴게시간 토글 (연봉제 단시간용 - 기존 호환)
 */
function _toggleBreakTime() {
    const noBreak = document.getElementById('contractNoBreak')?.checked;
    const breakStartHour = document.getElementById('contractBreakStartHour');
    const breakStartMin = document.getElementById('contractBreakStartMin');
    const breakEndHour = document.getElementById('contractBreakEndHour');
    const breakEndMin = document.getElementById('contractBreakEndMin');
    
    [breakStartHour, breakStartMin, breakEndHour, breakEndMin].forEach(el => {
        if (el) el.disabled = noBreak;
    });
    
    _updatePreviewIfSelected();
}

// ===== 미리보기 =====

/**
 * 미리보기 표시 (페이지 네비게이션 포함)
 */
function _previewFirstSelected(tabType) {
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    if (selectedIds.length === 0) {
        alert('직원을 선택해주세요.');
        return;
    }
    
 // ⭐ 미리보기 버튼 클릭 시 수정된 업무 내용 초기화 (자동 생성값으로 복원)
    _customJobDescriptions = {};
    
 // 첫 번째 직원부터 시작
    _currentPreviewIndex = 0;
    _showPreviewAtIndex(tabType, _currentPreviewIndex);
}

/**
 * 특정 인덱스의 직원 미리보기 표시
 */
function _showPreviewAtIndex(tabType, index) {
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    if (selectedIds.length === 0) return;
    
 // 인덱스 범위 확인
    if (index < 0) index = 0;
    if (index >= selectedIds.length) index = selectedIds.length - 1;
    _currentPreviewIndex = index;
    
    const employee = db.getEmployeeById(selectedIds[index]);
    if (!employee) return;
    
    const empName = employee.personalInfo?.name || '';
    
 // 네비게이션 UI + 계약서 생성
    _renderPreviewWithNavigation(employee, tabType, index, selectedIds.length, empName);
}

/**
 * 네비게이션 UI와 함께 미리보기 렌더링
 */
function _renderPreviewWithNavigation(employee, tabType, currentIndex, totalCount, empName) {
    let contractType;
    if (tabType === 'rank') contractType = 'rank';
    else if (tabType === 'salary-parttime') contractType = 'salary-parttime';
    else contractType = 'salary';
    
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const empCategory = _getEmploymentCategory(employee);
    const contractHTML = _generateContractHTML(employee, contractType, empCategory, suffix);
    
    const previewContainer = document.getElementById('contractPreviewContainer');
    if (!previewContainer) return;
    
 // 네비게이션 UI
    const navHTML = `
        <div class="preview-navigation" style="
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            padding: 12px 20px;
            margin-top: 15px;
            background: linear-gradient(135deg, #4f46e5 0%, #764ba2 100%);
            border-radius: 10px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        ">
            <button onclick="_prevPreview()" style="
                padding: 8px 16px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                ${currentIndex === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            " ${currentIndex === 0 ? 'disabled' : ''} 
               onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                ◀ 이전
            </button>
            
            <div style="
                color: white;
                font-size: 15px;
                font-weight: 600;
                min-width: 200px;
                text-align: center;
            ">
                <span style="font-size: 16px;">${empName}</span>
                <span style="opacity: 0.8; margin-left: 8px;">(${currentIndex + 1} / ${totalCount})</span>
            </div>
            
            <button onclick="_nextPreview()" style="
                padding: 8px 16px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                ${currentIndex === totalCount - 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
            " ${currentIndex === totalCount - 1 ? 'disabled' : ''}
               onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                다음 ▶
            </button>
        </div>
    `;
    
    previewContainer.innerHTML = navHTML + contractHTML;
}

/**
 * 이전 미리보기
 */
function _prevPreview() {
    const tabType = _getCurrentContractTab();
    if (_currentPreviewIndex > 0) {
        _showPreviewAtIndex(tabType, _currentPreviewIndex - 1);
    }
}

/**
 * 다음 미리보기
 */
function _nextPreview() {
    const tabType = _getCurrentContractTab();
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    if (_currentPreviewIndex < selectedIds.length - 1) {
        _showPreviewAtIndex(tabType, _currentPreviewIndex + 1);
    }
}

/**
 * 선택 변경 시 미리보기 업데이트
 */
function _updatePreviewIfSelected() {
    const tabType = _getCurrentContractTab();
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    
 // ⭐ 미리보기 갱신 시 수정된 업무 내용 초기화 (자동 생성값으로 복원)
    _customJobDescriptions = {};
    
    if (selectedIds.length > 0) {
 // 현재 인덱스가 범위를 벗어나면 조정
        if (_currentPreviewIndex >= selectedIds.length) {
            _currentPreviewIndex = selectedIds.length - 1;
        }
        _showPreviewAtIndex(tabType, _currentPreviewIndex);
    } else {
 // 선택된 직원 없으면 미리보기 초기화
        const previewContainer = document.getElementById('contractPreviewContainer');
        if (previewContainer) previewContainer.innerHTML = '';
    }
}

/**
 * 미리보기용 계약서 생성 (네비게이션 없이)
 */
function _generateAndShowPreview(employee, tabType) {
    let contractType;
    if (tabType === 'rank') contractType = 'rank';
    else if (tabType === 'salary-parttime') contractType = 'salary-parttime';
    else contractType = 'salary';
    
 // suffix 변환 (tabType -> DOM ID suffix)
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    
    const empCategory = _getEmploymentCategory(employee);
    const contractHTML = _generateContractHTML(employee, contractType, empCategory, suffix);
    
    const previewContainer = document.getElementById('contractPreviewContainer');
    if (previewContainer) previewContainer.innerHTML = contractHTML;
}

// ===== 인쇄 =====

function _printSelectedEmployees(tabType) {
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    if (selectedIds.length === 0) {
        alert('직원을 선택해주세요.');
        return;
    }
    
 // 선택된 직원들의 계약서 HTML 생성
    let contractType;
    if (tabType === 'rank') contractType = 'rank';
    else if (tabType === 'salary-parttime') contractType = 'salary-parttime';
    else contractType = 'salary';
    
 // suffix 변환 (tabType -> DOM ID suffix)
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    
    const contractHTMLs = selectedIds.map(empId => {
        const employee = db.getEmployeeById(empId);
        if (!employee) return '';
        const empCategory = _getEmploymentCategory(employee);
        return _generateContractHTML(employee, contractType, empCategory, suffix);
    }).filter(html => html);
    
    if (contractHTMLs.length === 0) return;
    
 // 브라우저로 열기 위한 HTML 생성
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>근로계약서 인쇄 (${selectedIds.length}명)</title>
            <style>
 /* 기본 스타일 */
 * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; line-height: 1.6; padding: 20px; }
                
 /* 인쇄 페이지 설정 - 여백 균등 */
                @page { 
                    size: A4; 
                    margin: 15mm 15mm 15mm 15mm;  /* 상 우 하 좌 균등 */
                }
                
                .contract-page { 
                    page-break-after: always; 
                    max-width: 210mm;
                    margin: 0 auto 30px;
                    padding: 20px;
                    border: 1px solid #ddd;
                    background: white;
                }
                .contract-page:last-child { page-break-after: avoid; }
                
                .contract-title { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; letter-spacing: 8px; }
                .contract-intro { margin-bottom: 15px; }
                .contract-section { margin-bottom: 5px; }
                .section-title { font-weight: normal; }
                .section-content { padding-left: 15px; }
                
                .salary-section { padding-left: 12px; }
                .salary-row { margin-bottom: 2px; }
                .allowance-list { padding-left: 20px; }
                .allowance-item { margin-bottom: 1px; }
                .insurance-list { padding-left: 15px; }
                
                .data-field { font-weight: bold; }
                .editable-field { border-bottom: 1px solid #999; padding: 0 3px; }
                
 /* 서명 영역 */
                .signature-section { margin-top: 30px; page-break-inside: avoid; }
                .signature-date { text-align: center; margin-bottom: 20px; }
                .contract-date { text-align: center; margin-bottom: 20px; }
                .signature-parties { 
                    display: table !important;
                    width: 100% !important;
                    table-layout: fixed !important;
                }
                .signature-party { 
                    display: table-cell !important;
                    width: 50% !important;
                    vertical-align: top !important;
                    padding: 0 10px !important;
                }
                .signature-party-title { font-weight: bold; margin-bottom: 10px; }
                .signature-row { margin-bottom: 5px; display: flex; }
                .signature-label { min-width: 60px; }
                .signature-value { flex: 1; }
                
 /* 서명란 성명 힌트 */
                .sign-name-hint { color: #ccc; font-weight: normal; letter-spacing: 3px; }
                
 /* 편집 가능 필드 - 화면에서는 밑줄 표시, 인쇄 시 숨김 */
                .editable-field { border-bottom: 1px solid #999; padding: 0 3px; }
                
 /* 추가 수당 관련 스타일 */
                .custom-allowance { position: relative; }
                .custom-allowance-name { padding-left: 0 !important; }
                .btn-remove-allowance {
                    background: #ff5252; color: white; border: none;
                    width: 18px; height: 18px; border-radius: 50%;
                    cursor: pointer; font-size: 12px; line-height: 1;
                    margin-left: 8px; vertical-align: middle;
                }
                .btn-remove-allowance:hover { background: #d32f2f; }
                .btn-add-allowance {
                    background: #4CAF50; color: white; border: none;
                    padding: 4px 12px; border-radius: 4px;
                    cursor: pointer; font-size: 11px; margin-top: 5px;
                }
                .btn-add-allowance:hover { background: #388E3C; }
                .allowance-add-btn { margin-top: 5px; }
                
 /* 추가 조항 관련 스타일 */
                .custom-clause-content { padding-left: 0 !important; }
                .btn-remove-clause {
                    background: #ff5252; color: white; border: none;
                    width: 18px; height: 18px; border-radius: 50%;
                    cursor: pointer; font-size: 12px; line-height: 1;
                    margin-left: 8px; vertical-align: middle;
                }
                .btn-remove-clause:hover { background: #d32f2f; }
                .btn-add-clause {
                    background: #4CAF50; color: white; border: none;
                    padding: 4px 12px; border-radius: 4px;
                    cursor: pointer; font-size: 11px; margin-top: 5px;
                }
                .btn-add-clause:hover { background: #388E3C; }
                .clause-add-btn { margin-top: 5px; }
                
 /* 호봉 테이블 */
                table.rank-table { border-collapse: collapse; display: inline-table; margin: 0 3px; vertical-align: middle; }
                table.rank-table td { border: 1px solid #000; padding: 4px 12px; text-align: center; font-size: 12px; }
                
 /* 인쇄 버튼 */
                .no-print { 
                    position: fixed; top: 20px; right: 20px; 
                    background: #2196F3; color: white; 
                    padding: 12px 24px; border: none; border-radius: 5px;
                    font-size: 14px; cursor: pointer; z-index: 9999;
                }
                .no-print:hover { background: #1976D2; }
                
                @media print {
                    body { padding: 0; }
                    .contract-page { border: none; margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .sign-name-hint { color: #ccc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 /* 인쇄 시 편집 필드 밑줄 숨김 */
                    .editable-field { border-bottom: none !important; }
 /* 인쇄 시 추가/삭제 버튼 숨김 */
                    .btn-remove-allowance { display: none !important; }
                    .btn-add-allowance { display: none !important; }
                    .allowance-add-btn { display: none !important; }
                    .btn-remove-clause { display: none !important; }
                    .btn-add-clause { display: none !important; }
                    .clause-add-btn { display: none !important; }
                }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄하기 (Ctrl+P)</button>
            ${contractHTMLs.join('\n')}
        </body>
        </html>
    `;
    
 // Electron 환경에서 시스템 브라우저로 열기
    if (window.electronAPI && window.electronAPI.openInBrowser) {
        window.electronAPI.openInBrowser(htmlContent, 'contract_print.html')
            .then(result => {
                if (result.success) {
                    로거_인사?.info('근로계약서 브라우저로 열기: ' + result.path);
                } else {
                    console.error('브라우저 열기 실패:', result.error);
 // 실패 시 기존 방식으로 fallback
                    _openPrintWindowFallback(htmlContent);
                }
            })
            .catch(e => {
                console.error('브라우저 열기 오류:', e);
                _openPrintWindowFallback(htmlContent);
            });
    } else {
 // Electron이 아닌 환경 (웹 브라우저) - 기존 방식
        _openPrintWindowFallback(htmlContent);
    }
    로거_인사?.info(`근로계약서 인쇄: ${selectedIds.length}명`);
}

/**
 * 기존 방식으로 인쇄 창 열기 (fallback)
 */
function _openPrintWindowFallback(htmlContent) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
    }
}

// 기존 printEmploymentContract 함수 (호환성 유지)
function printEmploymentContract() {
    const tabType = _getCurrentContractTab();
    _printSelectedEmployees(tabType);
}

// ===== 업무 내용 수정 저장 =====

/**
 * 미리보기에서 수정된 업무 내용 저장
 * @param {HTMLElement} element - 편집된 요소
 */
function _saveCustomJobDescription(element) {
    const empId = element.dataset.empId;
    const value = element.textContent.trim();
    
    if (empId && value) {
        _customJobDescriptions[empId] = value;
        로거_인사?.debug('업무 내용 저장', { empId, value });
    }
}

/**
 * 수정된 계약서 필드 저장 (주근무장소, 근무일/휴일, 가족수당)
 */
function _saveCustomContractField(element) {
    const empId = element.dataset.empId;
    const fieldType = element.dataset.fieldType;
    const value = element.textContent.trim();
    
    if (empId && fieldType && value) {
        if (!_customContractFields[empId]) {
            _customContractFields[empId] = {};
        }
        _customContractFields[empId][fieldType] = value;
        로거_인사?.debug('계약서 필드 저장', { empId, fieldType, value });
    }
}

/**
 * 저장된 계약서 필드 값 가져오기
 */
function _getCustomContractField(empId, fieldType) {
    return _customContractFields[empId]?.[fieldType] || _defaultContractFields[fieldType];
}

/**
 * 저장된 업무 내용 초기화 (모듈 초기화 시 호출)
 */
function _clearCustomJobDescriptions() {
    _customJobDescriptions = {};
}

// ===== 추가 수당 관리 =====

/**
 * 추가 수당 목록 가져오기
 */
function _getCustomAllowances(empId) {
    return _customAllowances[empId] || [];
}

/**
 * 추가 수당 추가
 */
function _addCustomAllowance(empId) {
    if (!_customAllowances[empId]) {
        _customAllowances[empId] = [];
    }
    
    const newAllowance = {
        id: Date.now(),
        name: '수당명',
        value: '금액 또는 내용'
    };
    
    _customAllowances[empId].push(newAllowance);
    로거_인사?.debug('추가 수당 추가', { empId, allowance: newAllowance });
    
 // 미리보기 갱신
    _refreshCurrentPreview();
}

/**
 * 추가 수당 삭제
 */
function _removeCustomAllowance(empId, allowanceId) {
    if (_customAllowances[empId]) {
        _customAllowances[empId] = _customAllowances[empId].filter(a => a.id !== allowanceId);
        로거_인사?.debug('추가 수당 삭제', { empId, allowanceId });
        
 // 미리보기 갱신
        _refreshCurrentPreview();
    }
}

/**
 * 추가 수당 수정 (이름)
 */
function _updateCustomAllowanceName(element) {
    const empId = element.dataset.empId;
    const allowanceId = parseInt(element.dataset.allowanceId);
    const value = element.textContent.trim();
    
    if (_customAllowances[empId]) {
        const allowance = _customAllowances[empId].find(a => a.id === allowanceId);
        if (allowance) {
            allowance.name = value || '수당명';
            로거_인사?.debug('추가 수당 이름 수정', { empId, allowanceId, name: value });
        }
    }
}

/**
 * 추가 수당 수정 (값)
 */
function _updateCustomAllowanceValue(element) {
    const empId = element.dataset.empId;
    const allowanceId = parseInt(element.dataset.allowanceId);
    const value = element.textContent.trim();
    
    if (_customAllowances[empId]) {
        const allowance = _customAllowances[empId].find(a => a.id === allowanceId);
        if (allowance) {
            allowance.value = value || '금액 또는 내용';
            로거_인사?.debug('추가 수당 값 수정', { empId, allowanceId, value });
        }
    }
}

/**
 * 추가 수당 HTML 생성
 */
function _generateCustomAllowancesHTML(empId) {
    const allowances = _getCustomAllowances(empId);
    
    let html = allowances.map(a => `
        <div class="allowance-item custom-allowance" data-allowance-id="${a.id}">· <span class="editable-field custom-allowance-name" contenteditable="true" title="수당명 수정" data-emp-id="${empId}" data-allowance-id="${a.id}" onblur="_updateCustomAllowanceName(this)">${a.name}</span> : <span class="editable-field" contenteditable="true" title="금액/내용 수정" data-emp-id="${empId}" data-allowance-id="${a.id}" onblur="_updateCustomAllowanceValue(this)">${a.value}</span><button type="button" class="btn-remove-allowance" onclick="_removeCustomAllowance('${empId}', ${a.id})" title="삭제">×</button></div>
    `).join('');
    
 // 추가 버튼
    html += `
        <div class="allowance-add-btn">
            <button type="button" class="btn-add-allowance" onclick="_addCustomAllowance('${empId}')">+ 수당 추가</button>
        </div>
    `;
    
    return html;
}

/**
 * 현재 미리보기 갱신
 */
function _refreshCurrentPreview() {
    const tabType = _getCurrentContractTab();
    const selectedIds = Array.from(_selectedEmployees[tabType]);
    
    if (selectedIds.length > 0 && _currentPreviewIndex < selectedIds.length) {
        const empId = selectedIds[_currentPreviewIndex];
        const employee = db.getEmployeeById(empId);
        if (employee) {
            _updatePreviewContent(employee, tabType);
        }
    }
}

/**
 * 미리보기 내용 업데이트
 */
function _updatePreviewContent(employee, tabType) {
    let contractType;
    if (tabType === 'rank') contractType = 'rank';
    else if (tabType === 'salary-parttime') contractType = 'salary-parttime';
    else contractType = 'salary';
    
    const suffix = tabType === 'rank' ? 'Rank' : (tabType === 'salary' ? 'Salary' : 'SalaryPartTime');
    const empCategory = _getEmploymentCategory(employee);
    const contractHTML = _generateContractHTML(employee, contractType, empCategory, suffix);
    
    const previewContainer = document.getElementById('contractPreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = contractHTML;
    }
}

// ===== 추가 조항 관리 =====

/**
 * 추가 조항 목록 가져오기
 */
function _getCustomClauses(empId) {
    return _customClauses[empId] || [];
}

/**
 * 추가 조항 추가
 */
function _addCustomClause(empId) {
    if (!_customClauses[empId]) {
        _customClauses[empId] = [];
    }
    
    const newClause = {
        id: Date.now(),
        content: '추가 조항 내용을 입력하세요'
    };
    
    _customClauses[empId].push(newClause);
    로거_인사?.debug('추가 조항 추가', { empId, clause: newClause });
    
 // 미리보기 갱신
    _refreshCurrentPreview();
}

/**
 * 추가 조항 삭제
 */
function _removeCustomClause(empId, clauseId) {
    if (_customClauses[empId]) {
        _customClauses[empId] = _customClauses[empId].filter(c => c.id !== clauseId);
        로거_인사?.debug('추가 조항 삭제', { empId, clauseId });
        
 // 미리보기 갱신
        _refreshCurrentPreview();
    }
}

/**
 * 추가 조항 수정
 */
function _updateCustomClauseContent(element) {
    const empId = element.dataset.empId;
    const clauseId = parseInt(element.dataset.clauseId);
    const value = element.textContent.trim();
    
    if (_customClauses[empId]) {
        const clause = _customClauses[empId].find(c => c.id === clauseId);
        if (clause) {
            clause.content = value || '추가 조항 내용을 입력하세요';
            로거_인사?.debug('추가 조항 수정', { empId, clauseId, content: value });
        }
    }
}

/**
 * 추가 조항 HTML 생성
 */
function _generateCustomClausesHTML(empId) {
    const clauses = _getCustomClauses(empId);
    
    let html = clauses.map(c => `<br>- <span class="editable-field custom-clause-content" contenteditable="true" title="조항 내용 수정" data-emp-id="${empId}" data-clause-id="${c.id}" onblur="_updateCustomClauseContent(this)">${c.content}</span><button type="button" class="btn-remove-clause" onclick="_removeCustomClause('${empId}', ${c.id})" title="삭제">×</button>`).join('');
    
 // 추가 버튼
    html += `
        <div class="clause-add-btn">
            <button type="button" class="btn-add-clause" onclick="_addCustomClause('${empId}')">+ 조항 추가</button>
        </div>
    `;
    
    return html;
}

// ===== 기준일 변경 =====

function onContractBaseDateChange() {
    _loadAllEmployeeLists();
    
    const previewContainer = document.getElementById('contractPreviewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
}

// ===== 호봉제 판단 함수 =====

/**
 * 특정 날짜 기준 호봉제 여부 판단
 * 
 * [v3.1 수정] 다중 폴백 패턴 적용
 * - rank.isRankBased (기존 직원)
 * - employment.isRankBased (신규 직원)
 */
function _isRankBasedAtDate(employee, baseDate) {
 // ⭐ 다중 폴백: rank.isRankBased → employment.isRankBased
    const getDefaultIsRankBased = (emp) => {
        if (emp.rank?.isRankBased !== undefined) return emp.rank.isRankBased === true;
        if (emp.employment?.isRankBased !== undefined) return emp.employment.isRankBased === true;
        return false; // 기본값: 연봉제
    };
    
    if (!baseDate) {
        return getDefaultIsRankBased(employee);
    }
    
    const assignments = employee.assignments || [];
    
    if (assignments.length === 0) {
        return getDefaultIsRankBased(employee);
    }
    
 // ⭐ assignments에서 effectiveDate 또는 date 필드 확인 (다중 폴백)
    const sortedAssignments = assignments
        .filter(a => {
            const aDate = a.effectiveDate || a.date;
            return aDate && aDate <= baseDate;
        })
        .sort((a, b) => {
            const aDate = a.effectiveDate || a.date;
            const bDate = b.effectiveDate || b.date;
            return bDate.localeCompare(aDate);
        });
    
    if (sortedAssignments.length === 0) {
        return getDefaultIsRankBased(employee);
    }
    
    const effectiveAssignment = sortedAssignments[0];
    
    if (effectiveAssignment.isRankBased !== undefined) {
        return effectiveAssignment.isRankBased === true;
    }
    
    return getDefaultIsRankBased(employee);
}

// ===== 분류 판단 함수 =====

function _getContractType(employee, weeklyHours = 40) {
 // ⭐ 다중 폴백: rank.isRankBased → employment.isRankBased
    const isRankBased = employee.rank?.isRankBased !== undefined 
        ? employee.rank.isRankBased === true
        : employee.employment?.isRankBased === true;
    if (isRankBased) return 'rank';
    if (weeklyHours < 40) return 'salary-parttime';
    return 'salary';
}

function _getEmploymentCategory(employee) {
    const empType = employee.employment?.type || '정규직';
    if (empType === '계약직' || empType === '기간제') return 'contract';
    return 'permanent';
}

// ===== 계약서 HTML 생성 함수 =====

// ===== 이벤트 핸들러 =====

/**
 * 직원 선택 변경 시 (탭별)
 * @param {string} tabType - 'rank', 'salary', 'salary-parttime'
 */
function onContractEmployeeChange(tabType) {
    try {
        let suffix;
        if (tabType === 'rank') suffix = 'Rank';
        else if (tabType === 'salary') suffix = 'Salary';
        else suffix = 'SalaryPartTime';
        
        const select = document.getElementById(`contractEmployeeSelect${suffix}`);
        const employeeId = select?.value;
        
        if (!employeeId) {
            const previewContainer = document.getElementById('contractPreviewContainer');
            if (previewContainer) previewContainer.innerHTML = '';
            _clearWorkingHoursDisplay(suffix);
            return;
        }
        
        const employee = db.getEmployeeById(employeeId);
        if (!employee) {
            에러처리_인사?.warn('직원 정보를 찾을 수 없습니다.');
            return;
        }
        
        _updateContractUIByEmployee(employee, suffix);
        updateContractPreview();
        
    } catch (error) {
        로거_인사?.error('직원 선택 변경 오류', error);
    }
}

/**
 * 근무시간 표시 초기화
 */
function _clearWorkingHoursDisplay(suffix) {
    const weeklyEl = document.getElementById(`contractWeeklyHours${suffix}`);
    const monthlyEl = document.getElementById(`contractMonthlyHours${suffix}`);
    if (weeklyEl) weeklyEl.textContent = '-';
    if (monthlyEl) monthlyEl.textContent = '-';
}

/**
 * 직원 정보로 UI 업데이트 (탭별)
 * @param {Object} employee - 직원 객체
 * @param {string} suffix - 'Rank', 'Salary', 'SalaryPartTime'
 */
function _updateContractUIByEmployee(employee, suffix) {
    const hireDateGroup = document.getElementById(`contractHireDateGroup${suffix}`);
    const periodGroup = document.getElementById(`contractPeriodGroup${suffix}`);
    const endGroup = document.getElementById(`contractEndGroup${suffix}`);
    const probationGroup = document.getElementById(`contractProbationGroup${suffix}`);
    
    const empCategory = _getEmploymentCategory(employee);
    
 // 정규직/계약직 구분에 따른 UI
    if (empCategory === 'permanent') {
        if (hireDateGroup) hireDateGroup.style.display = '';
        if (periodGroup) periodGroup.style.display = 'none';
        if (endGroup) endGroup.style.display = 'none';
        
        const hireDateEl = document.getElementById(`contractHireDate${suffix}`);
        const entryDate = employee.employment?.entryDate || employee.hireDate;
        if (hireDateEl && entryDate) hireDateEl.value = entryDate;
    } else {
        if (hireDateGroup) hireDateGroup.style.display = 'none';
        if (periodGroup) periodGroup.style.display = '';
        if (endGroup) endGroup.style.display = '';
        
        const today = new Date();
        const yearStart = `${today.getFullYear()}-01-01`;
        const yearEnd = `${today.getFullYear()}-12-31`;
        
        const startDateEl = document.getElementById(`contractStartDate${suffix}`);
        const endDateEl = document.getElementById(`contractEndDate${suffix}`);
        if (startDateEl) startDateEl.value = yearStart;
        if (endDateEl) endDateEl.value = yearEnd;
    }
    
    if (probationGroup) probationGroup.style.display = '';
    
 // ⭐ 단시간 탭: 날짜 자동 설정 (hireDateGroup 등이 없는 경우 직접 설정)
    if (suffix === 'SalaryPartTime') {
        const entryDate = employee.employment?.entryDate || employee.hireDate;
        const hireDateEl = document.getElementById(`contractHireDate${suffix}`);
        if (hireDateEl && entryDate) hireDateEl.value = entryDate;
        
        const today = new Date();
        const startDateEl = document.getElementById(`contractStartDate${suffix}`);
        const endDateEl = document.getElementById(`contractEndDate${suffix}`);
        if (startDateEl) startDateEl.value = `${today.getFullYear()}-01-01`;
        if (endDateEl) endDateEl.value = `${today.getFullYear()}-12-31`;
    }
    
 // ⭐ 주당근무시간/월소정근로시간 자동 조회
    _updateWorkingHoursDisplay(employee, suffix);
}

/**
 * 주당근무시간/월소정근로시간 표시 (직원 정보에서 자동 조회)
 * @param {Object} employee - 직원 객체
 * @param {string} suffix - 'Rank', 'Salary', 'SalaryPartTime'
 */
function _updateWorkingHoursDisplay(employee, suffix) {
 // 직원의 employment에서 주당근무시간 조회
    const weeklyHours = employee.employment?.weeklyWorkingHours ?? 40;
    
    const monthlyHours = _calculateMonthlyWorkingHours(weeklyHours);
    
    const weeklyEl = document.getElementById(`contractWeeklyHours${suffix}`);
    const monthlyEl = document.getElementById(`contractMonthlyHours${suffix}`);
    
    if (weeklyEl) weeklyEl.textContent = `${weeklyHours}시간`;
    if (monthlyEl) monthlyEl.textContent = `${monthlyHours}시간`;
}

/**
 * 현재 선택된 직원의 주당근무시간 조회
 */
function _getSelectedWeeklyHours() {
    const tabType = _getCurrentContractTab();
    let suffix;
    if (tabType === 'rank') suffix = 'Rank';
    else if (tabType === 'salary') suffix = 'Salary';
    else suffix = 'SalaryPartTime';
    
    const select = document.getElementById(`contractEmployeeSelect${suffix}`);
    const employeeId = select?.value;
    
    if (!employeeId) return 40;
    
    const employee = db.getEmployeeById(employeeId);
    if (!employee) return 40;
    
    return employee.employment?.weeklyWorkingHours ?? 40;
}

/**
 * 수습기간 토글 (탭별)
 * @param {string} tabType - 'rank', 'salary', 'salary-parttime'
 */
function toggleContractProbation(tabType) {
    let suffix;
    if (tabType === 'rank') suffix = 'Rank';
    else if (tabType === 'salary') suffix = 'Salary';
    else suffix = 'SalaryPartTime';
    
    const checkbox = document.getElementById(`contractHasProbation${suffix}`);
    const options = document.getElementById(`contractProbationOptions${suffix}`);
    if (options) options.style.display = checkbox?.checked ? '' : 'none';
    updateContractPreview();
}

function _calculateMonthlyWorkingHours(weeklyHours) {
 // ⭐ 급여계산기의 함수 사용 (급여설정의 올림/반올림/버림 적용)
    if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getMonthlyWorkingHours) {
        return SalaryCalculator.getMonthlyWorkingHours(weeklyHours);
    }
    
 // fallback: 기본 계산 (반올림)
    const WEEKS_PER_MONTH = 365 / 12 / 7;
    const weeklyRestHours = (weeklyHours / 40) * 8;
    const monthlyHours = (weeklyHours + weeklyRestHours) * WEEKS_PER_MONTH;
    return Math.round(monthlyHours);
}

function _calculateProbationEnd(startDate, months) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(months));
    end.setDate(end.getDate() - 1);
    return end.toISOString().split('T')[0];
}

// ===== 날짜 포맷팅 =====

function _formatDateDot(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function _formatDateKorean(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function _formatNameSpaced(name) {
    if (!name) return '';
    return name.split('').join(' ');
}

function _formatNumber(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ===== 미리보기 업데이트 =====

function updateContractPreview() {
    try {
        const tabType = _getCurrentContractTab();
        let suffix;
        if (tabType === 'rank') suffix = 'Rank';
        else if (tabType === 'salary') suffix = 'Salary';
        else suffix = 'SalaryPartTime';
        
        const select = document.getElementById(`contractEmployeeSelect${suffix}`);
        const employeeId = select?.value;
        if (!employeeId) return;
        
        const employee = db.getEmployeeById(employeeId);
        if (!employee) return;
        
        const weeklyHours = _getSelectedWeeklyHours();
        
 // ⭐ 탭 타입에 따라 계약서 유형 결정
        let contractType;
        if (tabType === 'rank') {
            contractType = 'rank';
        } else if (tabType === 'salary-parttime') {
            contractType = 'salary-parttime';
        } else {
            contractType = 'salary';
        }
        
        const empCategory = _getEmploymentCategory(employee);
        
        const contractHTML = _generateContractHTML(employee, contractType, empCategory, suffix);
        
        const previewContainer = document.getElementById('contractPreviewContainer');
        if (previewContainer) previewContainer.innerHTML = contractHTML;
        
    } catch (error) {
        로거_인사?.error('미리보기 업데이트 오류', error);
    }
}

// ===== HTML 생성 =====

function _generateContractHTML(employee, contractType, empCategory, suffix) {
 // 조직 설정
    const orgSettings = db.getOrganizationSettings();
    const orgName = orgSettings.name || '○○복지관';
    const orgAddress = orgSettings.address || '서울특별시 강남구 테헤란로 123';
    const orgPhone = orgSettings.phone || '02-1234-5678';
    const pensionBank = orgSettings.pensionBank || '농협은행';
    const pensionType = orgSettings.pensionType || 'DC';
    
 // 최고관리자 (기준일 기준)
    let managerPosition = '관장';
    let managerName = '';
    try {
 // 조직도 설정에서 order: 1인 직위 찾기
        const orgChartSettings = JSON.parse(localStorage.getItem('hr_org_chart_settings') || '{}');
        const positionSettings = orgChartSettings.positionSettings || [];
        const topPosition = positionSettings.find(p => p.order === 1);
        if (topPosition) {
            managerPosition = topPosition.name;
        }
        
 // 기준일에 해당 직위를 가진 직원 찾기
        const employees = db.getEmployees();
 // ⭐ 직접 기준일 조회 (contractDate가 아직 정의되지 않음)
        const baseDate = document.getElementById('contractBaseDate')?.value || new Date().toISOString().split('T')[0];
        
        for (const emp of employees) {
 // 기준일에 유효한 발령 찾기
            const assignments = emp.assignments || [];
            const sortedAssignments = [...assignments]
                .filter(a => a.startDate && a.startDate <= baseDate)
                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            
            const validAssignment = sortedAssignments.find(a => {
                if (!a.endDate || a.endDate >= baseDate) return true;
                return false;
            });
            
            const empPosition = validAssignment?.position || emp.currentPosition?.position;
            
            if (empPosition === managerPosition) {
                managerName = emp.personalInfo?.name || emp.name || '';
                break;
            }
        }
    } catch (e) {
        로거_인사?.warn('최고관리자 조회 오류', e);
    }
    
 // 직원 정보
    const empName = employee.personalInfo?.name || employee.name || '';
    const empDept = employee.currentPosition?.dept || '';
    const empPosition = employee.currentPosition?.position || '';
    const empGrade = employee.currentPosition?.grade || '';
    
 // ⭐ 계약일 = 공통 기준일
    const contractDate = document.getElementById('contractBaseDate')?.value || new Date().toISOString().split('T')[0];
    
 // ⭐ 연도 (contractStart/End보다 먼저 정의 필요)
    const year = contractDate ? new Date(contractDate).getFullYear() : new Date().getFullYear();
    
 // ⭐ [v3.3 수정] 날짜를 직원 데이터에서 직접 조회 (v3.0에서 DOM 요소 제거됨)
    const hireDate = employee.employment?.entryDate || employee.hireDate || '';
    const contractStart = employee.employment?.contractStartDate || `${year}-01-01`;
    const contractEnd = employee.employment?.contractEndDate || `${year}-12-31`;
    
 // 수습기간 (탭별 ID)
    const hasProbation = document.getElementById(`contractHasProbation${suffix}`)?.checked || false;
    const probationMonths = document.getElementById(`contractProbationMonths${suffix}`)?.value || '3';
    const probationStartDate = empCategory === 'permanent' ? hireDate : contractStart;
    const probationEnd = hasProbation && probationStartDate ? _calculateProbationEnd(probationStartDate, probationMonths) : '';
    
    if (hasProbation && probationStartDate) {
        const periodTextEl = document.getElementById(`contractProbationPeriodText${suffix}`);
        if (periodTextEl) periodTextEl.textContent = `${_formatDateDot(probationStartDate)} ~ ${_formatDateDot(probationEnd)}`;
    }
    
 // 근무시간 (직원 정보에서 자동 조회)
    const weeklyHours = _getSelectedWeeklyHours();
    const monthlyHours = _calculateMonthlyWorkingHours(weeklyHours);
    const dailyHours = weeklyHours / 5;
    
 // ⭐ 연봉제 기본급 조회
    let salaryBasePay = 0;
    if (contractType !== 'rank') {
        try {
            const salaryTables = JSON.parse(localStorage.getItem('hr_salary_tables') || '{}');
            const yearTable = salaryTables[year]?.salary;
            if (yearTable && empGrade) {
                salaryBasePay = yearTable[empGrade]?.baseSalary || 0;
            }
        } catch (e) {
            로거_인사?.warn('연봉제 기본급 조회 오류', e);
        }
    }
    
 // ⭐ 직책수당 조회
    let positionAllowance = 0;
    try {
        const allowances = JSON.parse(localStorage.getItem('hr_position_allowances') || '{}');
        const yearAllowances = allowances[year] || {};
 // 직위(position)로 조회
        if (empPosition && yearAllowances[empPosition]) {
            positionAllowance = yearAllowances[empPosition];
        }
    } catch (e) {
        로거_인사?.warn('직책수당 조회 오류', e);
    }
    
 // ⭐ 명절휴가비 조회
    let holidayBonusInfo = { type: 'rate', seolRate: 60, chuseokRate: 60, seolBonus: 0, chuseokBonus: 0 };
    try {
        const salarySettings = JSON.parse(localStorage.getItem('hr_salary_settings') || '{}');
        const salaryTables = JSON.parse(localStorage.getItem('hr_salary_tables') || '{}');
        
        if (contractType === 'rank') {
 // 호봉제: 비율로 표시 (설/추석 각각)
            const seolRate = salarySettings[year]?.holidayBonus?.설?.rate ?? 0.6;
            const chuseokRate = salarySettings[year]?.holidayBonus?.추석?.rate ?? 0.6;
            holidayBonusInfo = { 
                type: 'rate', 
                seolRate: Math.round(seolRate * 100), 
                chuseokRate: Math.round(chuseokRate * 100) 
            };
        } else {
 // 연봉제: 정액으로 표시
            const gradeInfo = salaryTables[year]?.salary?.[empGrade];
            if (gradeInfo?.seolBonus || gradeInfo?.chuseokBonus) {
                holidayBonusInfo = { 
                    type: 'fixed', 
                    seolBonus: gradeInfo.seolBonus || 0, 
                    chuseokBonus: gradeInfo.chuseokBonus || 0 
                };
            }
        }
    } catch (e) {
        로거_인사?.warn('명절휴가비 조회 오류', e);
    }
    
 // ⭐ 연봉제 계약기간: 기준일 ~ 연말
    let salaryContractStart = contractStart || contractDate;
    let salaryContractEnd = contractEnd || `${year}-12-31`;
    
 // ⭐ 업무 내용 동적 생성 (미리보기에서 수정한 값 우선 사용)
    let jobDescription = _customJobDescriptions[employee.id] || null;
    
    if (!jobDescription) {
 // 저장된 값이 없으면 자동 생성
        jobDescription = `${empDept} 업무`;  // 기본값
        try {
            const orgChartSettings = JSON.parse(localStorage.getItem('hr_org_chart_settings') || '{}');
            const positionSettings = orgChartSettings.positionSettings || [];
            
 // 직원의 직위로 role 찾기
            const positionInfo = positionSettings.find(p => p.name === empPosition);
            const role = positionInfo?.role || '';
            
            if (role === 'director' || role === 'viceDirector') {
 // 기관장/부기관장: 조직명에서 "복지관/시설/센터" 추출
                let orgType = '복지관';  // 기본값
                if (orgName.includes('센터')) {
                    orgType = '센터';
                } else if (orgName.includes('시설')) {
                    orgType = '시설';
                } else if (orgName.includes('복지관')) {
                    orgType = '복지관';
                } else if (orgName.includes('재단')) {
                    orgType = '재단';
                }
                
                if (role === 'director') {
                    jobDescription = `${orgType} 운영 총괄 업무`;
                } else {
                    jobDescription = `${orgType} 사업 총괄 업무`;
                }
            } else if (role === 'deptHead') {
 // 부서장: 부서명 + 총괄 업무
                jobDescription = `${empDept} 총괄 업무`;
            }
 // 그 외는 기본값 유지: 부서명 + 업무
        } catch (e) {
            로거_인사?.warn('업무 내용 생성 오류', e);
        }
    }
    
 // ⭐ [v3.3 수정] 모든 탭에서 근무시간 정보 읽기
    let workTimeInfo = {
        startHour: 9, startMin: 0,
        endHour: 18, endMin: 0,
        breakStartHour: 12, breakStartMin: 0,
        breakEndHour: 13, breakEndMin: 0,
        hasBreak: true
    };
    
 // ⭐ 탭별 DOM ID suffix 결정
    const timeSuffix = contractType === 'salary-parttime' ? '' : suffix;
    const noBreak = document.getElementById(`contractNoBreak${timeSuffix}`)?.checked;
    
 // ⭐ ?? 사용: null/undefined만 기본값, 0은 유효한 값으로 처리
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        const val = el?.value;
        return val !== undefined && val !== '' ? parseInt(val) : def;
    };
    
 // 기본값 설정 (호봉제/연봉제: 09~18시, 단시간: 10~15:30)
    const defaultStart = contractType === 'salary-parttime' ? 10 : 9;
    const defaultEnd = contractType === 'salary-parttime' ? 15 : 18;
    const defaultEndMin = contractType === 'salary-parttime' ? 30 : 0;
    const defaultBreakStartMin = contractType === 'salary-parttime' ? 30 : 0;
    
    workTimeInfo = {
        startHour: getVal(`contractStartHour${timeSuffix}`, defaultStart),
        startMin: getVal(`contractStartMin${timeSuffix}`, 0),
        endHour: getVal(`contractEndHour${timeSuffix}`, defaultEnd),
        endMin: getVal(`contractEndMin${timeSuffix}`, defaultEndMin),
        breakStartHour: noBreak ? 0 : getVal(`contractBreakStartHour${timeSuffix}`, 12),
        breakStartMin: noBreak ? 0 : getVal(`contractBreakStartMin${timeSuffix}`, defaultBreakStartMin),
        breakEndHour: noBreak ? 0 : getVal(`contractBreakEndHour${timeSuffix}`, 13),
        breakEndMin: noBreak ? 0 : getVal(`contractBreakEndMin${timeSuffix}`, 0),
        hasBreak: !noBreak
    };
    
 // 단시간용 변수 (하위 호환)
    let partTimeWorkInfo = workTimeInfo;
    
 // 공통 데이터
    const data = {
        orgName, orgAddress, orgPhone, pensionBank, pensionType,
        managerPosition, managerName,
        empName, empDept, empPosition, empGrade,
        jobDescription,  // ⭐ 업무 내용 추가
        contractDate, hireDate, contractStart, contractEnd,
        salaryContractStart, salaryContractEnd, salaryBasePay,  // ⭐ 연봉제용 추가
        positionAllowance,  // ⭐ 직책수당 추가
        holidayBonusInfo,   // ⭐ 명절휴가비 추가
        partTimeWorkInfo,   // ⭐ 단시간 근무시간 추가
        workTimeInfo,       // ⭐ [v3.3] 모든 탭용 근무시간 추가
        year, weeklyHours, monthlyHours, dailyHours,
        hasProbation, probationMonths, probationEnd, probationStartDate,
        empCategory, employee
    };
    
    if (contractType === 'rank') return _generateRankBasedContractHTML(data);
    if (contractType === 'salary-parttime') return _generateSalaryPartTimeContractHTML(data);
    return _generateSalaryContractHTML(data);
}

// ===== 호봉제 서식 =====

function _generateRankBasedContractHTML(data) {
    const {
        orgName, orgAddress, orgPhone, pensionBank, pensionType,
        managerPosition, managerName,
        empName, empDept, empPosition, empGrade,
        jobDescription,  // ⭐ 업무 내용 추가
        contractDate, hireDate, contractStart, contractEnd,
        positionAllowance,  // ⭐ 직책수당 추가
        holidayBonusInfo,   // ⭐ 명절휴가비 추가
        workTimeInfo,       // ⭐ [v3.3] 근무시간 설정
        year, weeklyHours, monthlyHours,
        hasProbation, probationMonths, probationEnd, probationStartDate,
        empCategory, employee
    } = data;
    
 // ⭐ [v3.3] 근무시간 정보 추출 (기본값 포함)
    const {
        startHour = 9, startMin = 0,
        endHour = 18, endMin = 0,
        breakStartHour = 12, breakStartMin = 0,
        breakEndHour = 13, breakEndMin = 0,
        hasBreak = true
    } = workTimeInfo || {};
    
 // 휴게시간 표시 텍스트
    const breakTimeText = hasBreak 
        ? `${breakStartHour}시 ${String(breakStartMin).padStart(2,'0')}분 ~ ${breakEndHour}시 ${String(breakEndMin).padStart(2,'0')}분`
        : '없음';
    
 // 1조: 근로개시일 또는 계약기간
    const clause1 = empCategory === 'permanent'
        ? `<span class="section-title">1. 근로개시일 : <span class="data-field">${_formatDateKorean(hireDate)}</span> 부터</span>`
        : `<span class="section-title">1. 근로계약기간 : <span class="data-field">${_formatDateKorean(contractStart)}</span> 부터 <span class="data-field">${_formatDateKorean(contractEnd)}</span> 까지</span>`;
    
 // 수습기간 섹션
    const probationSection = hasProbation ? `
        <div class="probation-section">
            <div>· 수습기간 : <span class="data-field">${probationMonths}</span>개월 (<span class="data-field">${_formatDateDot(probationStartDate)}</span> ~ <span class="data-field">${_formatDateDot(probationEnd)}</span>)</div>
            <div>· 수습기간 급여 : 100%</div>
            <div>· 수습기간 중 업무 적응이 곤란하거나 부적합한 자로 인정될 때에는 발령을 취소할 수 있음</div>
            <div>· 수습기간도 근속연수에 포함</div>
        </div>
    ` : '';
    
 // 호봉 정보 - 계약일 기준으로 동적 계산
    let currentRank = employee.rank?.startRank || 1;
    let upgradeDate = '';
    
 // ⭐ v5.0.0: 계약일 기준 로컬 호봉 계산
    try {
        const startRank = employee.rank?.startRank || 1;
        const firstUpgradeDateStr = employee.rank?.firstUpgradeDate;
        
        if (firstUpgradeDateStr && firstUpgradeDateStr !== '-' && contractDate >= firstUpgradeDateStr) {
 // 최초 승급 이후: startRank + 1 + 경과년수
            const firstUpgrade = new Date(firstUpgradeDateStr);
            const contract = new Date(contractDate);
            
 // 경과 년수 계산 (승급일 기준)
            let yearsAfterFirst = contract.getFullYear() - firstUpgrade.getFullYear();
            
 // 승급월일이 아직 안 지났으면 -1
            const upgradeMonth = firstUpgrade.getMonth();
            const upgradeDay = firstUpgrade.getDate();
            const contractMonth = contract.getMonth();
            const contractDay = contract.getDate();
            
            if (contractMonth < upgradeMonth || (contractMonth === upgradeMonth && contractDay < upgradeDay)) {
                yearsAfterFirst--;
            }
            
            currentRank = startRank + 1 + Math.max(0, yearsAfterFirst);
        } else {
            currentRank = startRank;
        }
    } catch (e) {
        로거_인사?.warn('호봉 계산 오류, 기본값 사용', e);
        currentRank = employee.rank?.startRank || 1;
    }
    
 // ⭐ 계약 연도의 승급일 직접 계산 (firstUpgradeDate에서 월/일 추출)
    const contractYear = new Date(contractDate).getFullYear();
    const firstUpgradeDate = employee.rank?.firstUpgradeDate;
    const nextUpgradeDate = employee.rank?.nextUpgradeDate;
    
 // ⭐ [v3.2] 첫 승급일이 계약년도 이후인지 확인 (신규입사자 판단)
    const firstUpgradeYear = firstUpgradeDate ? parseInt(firstUpgradeDate.substring(0, 4)) : null;
    const hasNoUpgradeThisYear = firstUpgradeYear && firstUpgradeYear > contractYear;
    
    if (firstUpgradeDate && firstUpgradeDate !== '-' && firstUpgradeDate.length >= 10 && !hasNoUpgradeThisYear) {
 // 기존 직원: firstUpgradeDate에서 월/일 추출 → 계약연도 적용
        const upgradeMonthDay = firstUpgradeDate.substring(5); // "08-01"
        upgradeDate = `${contractYear}-${upgradeMonthDay}`;
    }
    
 // ⭐ 승급일이 계약일 **이후**인지 확인 (같은 연도는 이미 보장됨)
    const contractDateTime = new Date(contractDate);
    const upgradeDateTime = upgradeDate ? new Date(upgradeDate) : null;
    
 // 승급일이 계약일보다 이후인 경우에만 호봉 변경
 // - 계약일 2025.1.1, 승급일 2025.1.1 → 동일 (이미 승급 완료)
 // - 계약일 2025.1.1, 승급일 2025.8.1 → 변경 (연중 승급 예정)
    const isUpgradeAfterContract = upgradeDateTime && upgradeDateTime > contractDateTime;
    
 // 승급 후 호봉 (계약일 이후 승급일 때만 변경)
    const nextRankCalc = isUpgradeAfterContract ? currentRank + 1 : currentRank;
    
 // 급여표에서 기본급 조회
    let currentBasePay = 0;
    let nextBasePay = 0;
    try {
        if (typeof SalarySettingsManager !== 'undefined') {
            const salaryTable = SalarySettingsManager.getSalaryTableByYear(year);
            if (salaryTable?.rank && empGrade) {
                const gradeTable = salaryTable.rank[empGrade];
                if (gradeTable) {
                    currentBasePay = gradeTable[currentRank] || 0;
                    nextBasePay = gradeTable[nextRankCalc] || 0;
                }
            }
        }
    } catch (e) {
        로거_인사?.warn('급여표 조회 오류', e);
    }
    
    return `
        <div class="contract-page" id="contract-preview-rank">
            <h1 class="contract-title">근 로 계 약 서</h1>
            
            <div class="contract-intro">
                <span class="employer-name">${orgName}</span>(이하 "사용자"라 함)과(와) 
                <span class="sign-name-hint">${_formatNameSpaced(empName)}</span>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.
            </div>
            
            <div class="contract-section">
                ${clause1}
                ${probationSection}
            </div>
            
            <div class="contract-section">
                <span class="section-title">2. 주근무장소 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workPlace" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workPlace')}</span></span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">3. 업무의 내용 : <span class="data-field editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" onblur="_saveCustomJobDescription(this)">${jobDescription}</span> 등 기타 "사용자가 지시하는 업무(단, 업무상 필요시 조정 가능)</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">4. 근로시간 : <span class="data-field">${String(startHour).padStart(2,'0')}</span>시 <span class="data-field">${String(startMin).padStart(2,'0')}</span>분부터 <span class="data-field">${String(endHour).padStart(2,'0')}</span>시 <span class="data-field">${String(endMin).padStart(2,'0')}</span>분까지 (휴게시간: ${breakTimeText})</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">5. 근무일/휴일 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workDays" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workDays')}</span></span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">6. 임금</div>
                <div class="salary-section">
                    <div class="salary-row">
                        - 기본급 : <span class="data-field">${year}</span>년 사회복지시설 종사자 인건비 가이드라인에 따라 - 
                        [ <span class="data-field">${empGrade || '일반직'}</span> <span class="data-field">${currentRank}</span> 호봉 ]
                    </div>
                    
                    ${hasNoUpgradeThisYear ? `
                    <!-- 신규입사자: 계약년도 내 승급 없음 - 방안 2 -->
                    <div style="padding-left: 55px; display: inline-flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 5px !important;">
                        <span>(기본급</span>
                        <span class="data-field">${currentBasePay ? _formatNumber(currentBasePay) : '_________'}</span>
                        <span>원, 첫 승급 예정일:</span>
                        <span class="data-field">${firstUpgradeDate ? _formatDateDot(firstUpgradeDate) : '____. __. __.'}</span>
                        <span>)</span>
                    </div>
                    ` : `
                    <!-- 기존 직원: 계약년도 내 승급 있음 -->
                    <div style="padding-left: 55px; display: inline-flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 5px !important;">
                        <span>(승급일</span>
                        <span class="data-field">${upgradeDate ? _formatDateDot(upgradeDate) : '____. __. __.'}</span>
                        <span>에</span>
                        
                        <table style="width: auto !important; border-collapse: collapse !important; display: inline-table !important; margin: 0 3px !important; vertical-align: middle !important; border: 1px solid #000 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; background: transparent !important;">
                            <tr>
                                <td style="border: 1px solid #000 !important; padding: 4px 12px !important; text-align: center !important; font-size: 12px !important; background: transparent !important;"><span class="data-field">${currentRank}</span> 호봉 기본급</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000 !important; padding: 4px 12px !important; text-align: center !important; font-size: 12px !important; background: transparent !important;"><span class="data-field">${currentBasePay ? _formatNumber(currentBasePay) : '_________'}</span> 원</td>
                            </tr>
                        </table>
                        
                        <span>에서</span>
                        
                        <table style="width: auto !important; border-collapse: collapse !important; display: inline-table !important; margin: 0 3px !important; vertical-align: middle !important; border: 1px solid #000 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; background: transparent !important;">
                            <tr>
                                <td style="border: 1px solid #000 !important; padding: 4px 12px !important; text-align: center !important; font-size: 12px !important; background: transparent !important;"><span class="data-field">${nextRankCalc}</span> 호봉 기본급</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000 !important; padding: 4px 12px !important; text-align: center !important; font-size: 12px !important; background: transparent !important;"><span class="data-field">${nextBasePay ? _formatNumber(nextBasePay) : '_________'}</span> 원</td>
                            </tr>
                        </table>
                        
                        <span>으로 변경)</span>
                    </div>
                    `}
                    
                    <div class="salary-row" style="margin-top: 5px;">
                        - 기타급여(제수당 등) : 있음( ∨ ), 없음(   )
                    </div>
                    
                    <div class="allowance-list">
                        ${positionAllowance > 0 ? `<div class="allowance-item">· 직책수당 : <span class="data-field">${_formatNumber(positionAllowance)}</span>원</div>` : ''}
                        <div class="allowance-item">· 명절휴가비 : ${holidayBonusInfo.seolRate === holidayBonusInfo.chuseokRate 
                            ? `연2회 각 호봉(설·추석이 속한 달)의 월 기본급의 <span class="data-field">${holidayBonusInfo.seolRate}</span>%`
                            : `설 기본급의 <span class="data-field">${holidayBonusInfo.seolRate}</span>%, 추석 기본급의 <span class="data-field">${holidayBonusInfo.chuseokRate}</span>%`}</div>
                        <div class="allowance-item">· 가족수당 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="familyAllowance" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'familyAllowance')}</span></div>
                        <div class="allowance-item">· 시간외근무수당 : (통상임금/<span class="data-field">${monthlyHours}</span>시간×1.5)×시간외근무시간</div>
                        ${_generateCustomAllowancesHTML(employee.id)}
                    </div>
                    
                    <div class="salary-row" style="margin-top: 3px;">
                        - 임금지급일 : 매월1일부터 말일까지 근무한 기간에 대해 매월 25일 지급(휴일의 경우 전일 지급)
                    </div>
                    <div class="salary-row">
                        - 지급방법 : 근로자에게 직접지급(   ), 근로자 명의의 예금통장에 입금( ∨ )
                    </div>
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">7. 연차유급휴가</div>
                <div class="section-content">- 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">8. 사회보험 적용여부 (해당란에 체크)</div>
                <div class="insurance-list">☑고용보험, ☑산재보험, ☑국민연금, ☑건강보험</div>
            </div>
            
            <div class="contract-section">
                <span class="section-title">9. 복리후생: ☑ 퇴직연금대상(<span class="data-field">${pensionBank}</span> <span class="data-field">${pensionType}</span>퇴직연금)</span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">10. 근로계약서 교부</div>
                <div class="section-content">
                    - 사용자는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부요구와<br>
                    &nbsp;&nbsp;관계없이 근로자에게 교부함(근로기준법 제17조 이행)
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">11. 근로계약, 취업규칙 등의 성실한 이행의무</div>
                <div class="section-content">- 사용자와 근로자는 각자가 근로계약, 취업규칙을 지키고 성실하게 이행하여야 함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">12. 기 타</div>
                <div class="section-content">
                    - 이 계약에 정함이 없는 사항은 근로기준법령에 의함.<br>
                    - 근로자가 사직하고자 할 경우 특별한 사유가 없는 한 1개월 전 사직서를 제출하여야 함.${_generateCustomClausesHTML(employee.id)}
                </div>
            </div>
            
            ${_generateSignatureSection(data)}
        </div>
    `;
}

// ===== 연봉제 서식 =====

function _generateSalaryContractHTML(data) {
    const {
        orgName, orgAddress, orgPhone, pensionBank, pensionType,
        managerPosition, managerName,
        empName, empDept, empPosition, empGrade,
        jobDescription,  // ⭐ 업무 내용 추가
        contractDate, hireDate, contractStart, contractEnd,
        salaryContractStart, salaryContractEnd, salaryBasePay,  // ⭐ 연봉제용
        positionAllowance,  // ⭐ 직책수당 추가
        holidayBonusInfo,   // ⭐ 명절휴가비 추가
        workTimeInfo,       // ⭐ [v3.3] 근무시간 설정
        year, weeklyHours, monthlyHours,
        hasProbation, probationMonths, probationEnd, probationStartDate,
        empCategory, employee  // ⭐ [v3.5] employee 추가
    } = data;
    
 // ⭐ [v3.3] 근무시간 정보 추출 (기본값 포함)
    const {
        startHour = 9, startMin = 0,
        endHour = 18, endMin = 0,
        breakStartHour = 12, breakStartMin = 0,
        breakEndHour = 13, breakEndMin = 0,
        hasBreak = true
    } = workTimeInfo || {};
    
 // 휴게시간 표시 텍스트
    const breakTimeText = hasBreak 
        ? `${breakStartHour}시 ${String(breakStartMin).padStart(2,'0')}분 ~ ${breakEndHour}시 ${String(breakEndMin).padStart(2,'0')}분`
        : '없음';
    
 // ⭐ 연봉제는 항상 계약기간으로 표시 (기준일 ~ 연말)
    const clause1 = `<span class="section-title">1. 근로계약기간 : <span class="data-field">${_formatDateKorean(salaryContractStart)}</span> 부터 <span class="data-field">${_formatDateKorean(salaryContractEnd)}</span> 까지</span>`;
    
 // 수습기간 섹션
    const probationSection = hasProbation ? `
        <div class="probation-section">
            <div>· 수습기간 : <span class="data-field">${probationMonths}</span>개월 (<span class="data-field">${_formatDateDot(probationStartDate)}</span> ~ <span class="data-field">${_formatDateDot(probationEnd)}</span>)</div>
            <div>· 수습기간 급여 : 100%</div>
            <div>· 수습기간 중 업무 적응이 곤란하거나 부적합한 자로 인정될 때에는 발령을 취소할 수 있음</div>
            <div>· 수습기간도 근속연수에 포함</div>
        </div>
    ` : '';
    
 // ⭐ 기본급 표시 (급여설정에서 조회)
    const baseSalaryDisplay = salaryBasePay > 0 
        ? `<span class="data-field">${_formatNumber(salaryBasePay)}</span>` 
        : '__________________';
    
    return `
        <div class="contract-page" id="contract-preview-salary">
            <h1 class="contract-title">근 로 계 약 서</h1>
            
            <div class="contract-intro">
                <span class="employer-name">${orgName}</span>(이하 "사용자"라 함)과(와) 
                <span class="sign-name-hint">${_formatNameSpaced(empName)}</span>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.
            </div>
            
            <div class="contract-section">
                ${clause1}
                ${probationSection}
            </div>
            
            <div class="contract-section">
                <span class="section-title">2. 주근무장소 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workPlace" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workPlace')}</span></span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">3. 업무의 내용 : <span class="data-field editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" onblur="_saveCustomJobDescription(this)">${jobDescription}</span> 등 기타 "사용자가 지시하는 업무(단, 업무상 필요시 조정 가능)</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">4. 근로시간 : <span class="data-field">${String(startHour).padStart(2,'0')}</span>시 <span class="data-field">${String(startMin).padStart(2,'0')}</span>분부터 <span class="data-field">${String(endHour).padStart(2,'0')}</span>시 <span class="data-field">${String(endMin).padStart(2,'0')}</span>분까지 (휴게시간: ${breakTimeText})</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">5. 근무일/휴일 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workDays" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workDays')}</span></span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">6. 임금</div>
                <div class="salary-section">
                    <div class="salary-row">
                        - 기본급 : ${baseSalaryDisplay} 원 [ <span class="data-field">${empGrade || empPosition || '영양사'}</span> ]
                    </div>
                    
                    <div class="salary-row" style="margin-top: 5px;">
                        - 기타급여(제수당 등) : 있음( ∨ ), 없음(   )
                    </div>
                    
                    <div class="allowance-list">
                        ${positionAllowance > 0 ? `<div class="allowance-item">· 직책수당 : <span class="data-field">${_formatNumber(positionAllowance)}</span>원</div>` : ''}
                        <div class="allowance-item">· 명절휴가비 : ${holidayBonusInfo.type === 'fixed' 
                            ? `설 <span class="data-field">${_formatNumber(holidayBonusInfo.seolBonus)}</span>원, 추석 <span class="data-field">${_formatNumber(holidayBonusInfo.chuseokBonus)}</span>원` 
                            : (holidayBonusInfo.seolRate === holidayBonusInfo.chuseokRate 
                                ? `연2회 각 호봉(설·추석이 속한 달)의 월 기본급의 <span class="data-field">${holidayBonusInfo.seolRate}</span>%`
                                : `설 기본급의 <span class="data-field">${holidayBonusInfo.seolRate}</span>%, 추석 기본급의 <span class="data-field">${holidayBonusInfo.chuseokRate}</span>%`)}</div>
                        <div class="allowance-item">· 가족수당 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="familyAllowance" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'familyAllowance')}</span></div>
                        <div class="allowance-item">· 시간외근무수당 : (통상임금/<span class="data-field">${monthlyHours}</span>시간×1.5)×시간외근무시간</div>
                        ${_generateCustomAllowancesHTML(employee.id)}
                    </div>
                    
                    <div class="salary-row" style="margin-top: 3px;">
                        - 임금지급일 : 매월1일부터 말일까지 근무한 기간에 대해 매월 25일 지급(휴일의 경우 전일 지급)
                    </div>
                    <div class="salary-row">
                        - 지급방법 : 근로자에게 직접지급(   ), 근로자 명의의 예금통장에 입금( ∨ )
                    </div>
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">7. 연차유급휴가</div>
                <div class="section-content">- 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">8. 사회보험 적용여부 (해당란에 체크)</div>
                <div class="insurance-list">☑고용보험, ☑산재보험, ☑국민연금, ☑건강보험</div>
            </div>
            
            <div class="contract-section">
                <span class="section-title">9. 복리후생: ☑ 퇴직연금대상(<span class="data-field">${pensionBank}</span> <span class="data-field">${pensionType}</span>퇴직연금)</span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">10. 근로계약서 교부</div>
                <div class="section-content">
                    - 사용자는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부요구와<br>
                    &nbsp;&nbsp;관계없이 근로자에게 교부함(근로기준법 제17조 이행)
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">11. 근로계약, 취업규칙 등의 성실한 이행의무</div>
                <div class="section-content">- 사용자와 근로자는 각자가 근로계약, 취업규칙을 지키고 성실하게 이행하여야 함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">12. 기 타</div>
                <div class="section-content">
                    - 이 계약에 정함이 없는 사항은 근로기준법령에 의함.<br>
                    - 근로자가 사직하고자 할 경우 특별한 사유가 없는 한 1개월 전 사직서를 제출하여야 함.${_generateCustomClausesHTML(employee.id)}
                </div>
            </div>
            
            ${_generateSignatureSection(data)}
        </div>
    `;
}

// ===== 연봉제(단시간) 서식 =====

function _generateSalaryPartTimeContractHTML(data) {
    const {
        orgName, orgAddress, orgPhone, pensionBank, pensionType,
        managerPosition, managerName,
        empName, empDept, empPosition, empGrade,
        jobDescription,  // ⭐ 업무 내용 추가
        contractDate, hireDate, contractStart, contractEnd,
        salaryContractStart, salaryContractEnd, salaryBasePay,  // ⭐ 연봉제용
        positionAllowance,  // ⭐ 직책수당 추가
        holidayBonusInfo,   // ⭐ 명절휴가비 추가
        partTimeWorkInfo,   // ⭐ 단시간 근무시간 추가
        year, weeklyHours, monthlyHours, dailyHours,
        hasProbation, probationMonths, probationEnd, probationStartDate,
        empCategory, employee  // ⭐ [v3.5] employee 추가
    } = data;
    
 // ⭐ 입력받은 근무시간 사용
    const { startHour, startMin, endHour, endMin, 
            breakStartHour, breakStartMin, breakEndHour, breakEndMin } = partTimeWorkInfo;
    
 // 휴게시간 계산 (분 단위)
    const breakMinutes = (breakEndHour * 60 + breakEndMin) - (breakStartHour * 60 + breakStartMin);
    const hasBreak = breakMinutes > 0;
    
 // ⭐ 연봉제(단시간)도 항상 계약기간으로 표시 (기준일 ~ 연말)
    const clause1 = `<span class="section-title">1. 근로계약기간 : <span class="data-field">${_formatDateKorean(salaryContractStart)}</span> 부터 <span class="data-field">${_formatDateKorean(salaryContractEnd)}</span> 까지</span>`;
    
 // 수습기간 섹션
    const probationSection = hasProbation ? `
        <div class="probation-section">
            <div>· 수습기간 : <span class="data-field">${probationMonths}</span>개월 (<span class="data-field">${_formatDateDot(probationStartDate)}</span> ~ <span class="data-field">${_formatDateDot(probationEnd)}</span>)</div>
            <div>· 수습기간 급여 : 100%</div>
            <div>· 수습기간 중 업무 적응이 곤란하거나 부적합한 자로 인정될 때에는 발령을 취소할 수 있음</div>
            <div>· 수습기간도 근속연수에 포함</div>
        </div>
    ` : '';
    
 // ⭐ 기본급 표시 (급여설정에서 조회)
    const baseSalaryDisplay = salaryBasePay > 0 
        ? `<span class="data-field">${_formatNumber(salaryBasePay)}</span>` 
        : '__________________';
    
    return `
        <div class="contract-page" id="contract-preview-salary-parttime">
            <h1 class="contract-title">근 로 계 약 서</h1>
            
            <div class="contract-intro">
                <span class="employer-name">${orgName}</span>(이하 "사용자"라 함)과(와) 
                <span class="sign-name-hint">${_formatNameSpaced(empName)}</span>(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.
            </div>
            
            <div class="contract-section">
                ${clause1}
                ${probationSection}
            </div>
            
            <div class="contract-section">
                <span class="section-title">2. 주근무장소 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workPlace" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workPlace')}</span></span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">3. 업무의 내용 : <span class="data-field editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" onblur="_saveCustomJobDescription(this)">${jobDescription}</span> 등 기타 "사용자가 지시하는 업무(단, 업무상 필요시 조정 가능)</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">4. 근로시간 : <span class="data-field">${startHour}</span>시 <span class="data-field">${String(startMin).padStart(2,'0')}</span>분부터 <span class="data-field">${endHour}</span>시 <span class="data-field">${String(endMin).padStart(2,'0')}</span>분까지 (휴게시간: ${hasBreak ? `${breakStartHour}시 ${String(breakStartMin).padStart(2,'0')}분 ~ ${breakEndHour}시 ${String(breakEndMin).padStart(2,'0')}분` : '없음'})</span>
            </div>
            
            <div class="contract-section">
                <span class="section-title">5. 근무일/휴일 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="workDays" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'workDays')}</span></span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">6. 임금</div>
                <div class="salary-section">
                    <div class="salary-row">
                        - 기본급 : ${baseSalaryDisplay} 원 [ <span class="data-field">${empGrade || empPosition || '영양사'}</span> ]
                    </div>
                    
                    <div class="salary-row" style="margin-top: 5px;">
                        - 기타급여(제수당 등) : 있음( ∨ ), 없음(   )
                    </div>
                    
                    <div class="allowance-list">
                        ${positionAllowance > 0 ? `<div class="allowance-item">· 직책수당 : <span class="data-field">${_formatNumber(positionAllowance)}</span>원</div>` : ''}
                        <div class="allowance-item">· 명절휴가비 : ${holidayBonusInfo.type === 'fixed' && (holidayBonusInfo.seolBonus > 0 || holidayBonusInfo.chuseokBonus > 0)
                            ? `설 <span class="data-field">${_formatNumber(holidayBonusInfo.seolBonus)}</span>원, 추석 <span class="data-field">${_formatNumber(holidayBonusInfo.chuseokBonus)}</span>원` 
                            : '별도 협의'}</div>
                        <div class="allowance-item">· 가족수당 : <span class="editable-field" contenteditable="true" title="클릭하여 수정" data-emp-id="${employee.id}" data-field-type="familyAllowance" onblur="_saveCustomContractField(this)">${_getCustomContractField(employee.id, 'familyAllowance')}</span></div>
                        <div class="allowance-item">· 시간외근무수당 : (통상임금/<span class="data-field">${monthlyHours}</span>시간×1.5)×시간외근무시간</div>
                        ${_generateCustomAllowancesHTML(employee.id)}
                    </div>
                    
                    <div class="salary-row" style="margin-top: 3px;">
                        - 임금지급일 : 매월1일부터 말일까지 근무한 기간에 대해 매월 25일 지급(휴일의 경우 전일 지급)
                    </div>
                    <div class="salary-row">
                        - 지급방법 : 근로자에게 직접지급(   ), 근로자 명의의 예금통장에 입금( ∨ )
                    </div>
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">7. 연차유급휴가</div>
                <div class="section-content">- 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">8. 사회보험 적용여부 (해당란에 체크)</div>
                <div class="insurance-list">☑고용보험, ☑산재보험, ☑국민연금, ☑건강보험</div>
            </div>
            
            <div class="contract-section">
                <span class="section-title">9. 복리후생: ☑ 퇴직연금대상(<span class="data-field">${pensionBank}</span> <span class="data-field">${pensionType}</span>퇴직연금)</span>
            </div>
            
            <div class="contract-section">
                <div class="section-title">10. 근로계약서 교부</div>
                <div class="section-content">
                    - 사용자는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부요구와<br>
                    &nbsp;&nbsp;관계없이 근로자에게 교부함(근로기준법 제17조 이행)
                </div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">11. 근로계약, 취업규칙 등의 성실한 이행의무</div>
                <div class="section-content">- 사용자와 근로자는 각자가 근로계약, 취업규칙을 지키고 성실하게 이행하여야 함.</div>
            </div>
            
            <div class="contract-section">
                <div class="section-title">12. 기 타</div>
                <div class="section-content">
                    - 이 계약에 정함이 없는 사항은 근로기준법령에 의함.<br>
                    - 근로자가 사직하고자 할 경우 특별한 사유가 없는 한 1개월 전 사직서를 제출하여야 함.${_generateCustomClausesHTML(employee.id)}
                </div>
            </div>
            
            ${_generateSignatureSection(data)}
        </div>
    `;
}

// ===== 서명 영역 =====

function _generateSignatureSection(data) {
    const { orgName, orgAddress, orgPhone, managerPosition, managerName, empName, contractDate } = data;
    
    return `
        <div class="signature-section">
            <div class="signature-date">
                <span class="data-field">${_formatDateKorean(contractDate)}</span>
            </div>
            
            <div class="signature-block">
                <div class="signature-party">
                    <div class="signature-party-title">(사용자)</div>
                    <div class="signature-row">
                        <span class="signature-label">업체명:</span>
                        <span class="signature-value">${orgName} (연락처: ${orgPhone})</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">주소:</span>
                        <span class="signature-value">${orgAddress}</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">${managerPosition}:</span>
                        <span class="signature-value">${managerName ? _formatNameSpaced(managerName) : ''}<span style="margin-left: 20px;">(인)</span></span>
                    </div>
                </div>
                
                <div class="signature-party">
                    <div class="signature-party-title">(근로자)</div>
                    <div class="signature-row">
                        <span class="signature-label">주소:</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">연락처:</span>
                    </div>
                    <div class="signature-row">
                        <span class="signature-label">성명:</span>
                        <span class="signature-value"><span class="sign-name-hint">${_formatNameSpaced(empName)}</span><span style="margin-left: 20px;">(인)</span></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== 인쇄 =====

function printEmploymentContract() {
    try {
 // ⭐ 현재 탭에 따라 적절한 직원 선택 요소 확인
        const tabType = _getCurrentContractTab();
        let suffix;
        if (tabType === 'rank') suffix = 'Rank';
        else if (tabType === 'salary') suffix = 'Salary';
        else suffix = 'SalaryPartTime';
        
        const select = document.getElementById(`contractEmployeeSelect${suffix}`);
        if (!select?.value) {
            에러처리_인사?.warn('직원을 먼저 선택해주세요.');
            return;
        }
        
        const previewContainer = document.getElementById('contractPreviewContainer');
        if (!previewContainer?.innerHTML) {
            에러처리_인사?.warn('인쇄할 내용이 없습니다.');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            에러처리_인사?.warn('팝업이 차단되었습니다.');
            return;
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>근로계약서 인쇄</title>
                <link rel="stylesheet" href="css/근로계약서_스타일.css">
            </head>
            <body>
                ${previewContainer.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        로거_인사?.info('근로계약서 인쇄 실행');
        
    } catch (error) {
        로거_인사?.error('인쇄 오류', error);
    }
}

console.log(' 근로계약서_인사.js 로드 완료 (v5.3.0 - 추가 조항 기능)');
