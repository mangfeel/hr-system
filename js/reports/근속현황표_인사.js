/**
 * 근속현황표_인사.js
 * 
 * 직원 근속개월수 분석표 생성 (복지관 평가용)
 * - 분석 기간 설정 (시작년도~종료년도)
 * - 부서별/고용형태별 필터링
 * - 특수부서 설정 (근속 계산 제외)
 * - 월별 근속개월수 계산
 * - 연말 기준 근속개월수 표시
 * - 집계 정보 (30개월 이상 근속자 수, 확보 직원 수)
 * - 엑셀 다운로드
 * - 인쇄 (A4 가로)
 * 
 * @version 1.2.1
 * @since 2025-11-27
 * 
 * [변경 이력]
 * v1.0.0 - 최초 생성
 * v1.1.0 - 특수부서 기능 추가
 * - 특수부서 선택 UI (localStorage에 마지막 선택값 저장)
 * - 근속시작일 컬럼 추가 (입사일과 다를 경우 색상 강조)
 * - 인쇄 기능 수정 (백지 출력 문제 해결)
 * - 발령 이력 기반 근속시작일 계산
 * v1.1.1 - 정렬 순서 변경
 * - 근속시작일순 → 이름 가나다순
 * v1.2.0 - UI/UX 개선
 * - 테이블 헤더 고정 (스크롤 시에도 헤더 보임)
 * - 셀 줄바꿈 방지 (white-space: nowrap)
 * - 셀 너비 최적화
 * - 인쇄 시 줄바꿈 방지
 * v1.2.1 - 좌측 컬럼 고정
 * - 가로 스크롤 시 좌측 7개 컬럼 고정 (No~퇴사일)
 * - 세로 스크롤 시 헤더 고정
 * - 고정 영역에 그림자 효과
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 호봉계산기_인사.js (DateUtils)
 * - 직원유틸_인사.js (직원유틸_인사)
 * - DOM유틸_인사.js (DOM유틸_인사)
 * - 인쇄유틸_인사.js (인쇄유틸_인사)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 * - XLSX (SheetJS) - 엑셀 다운로드
 */

// ===== 전역 변수 =====

/**
 * 현재 생성된 근속현황표 데이터
 * @type {Array|null}
 */
let _tenureReportData = null;

/**
 * 현재 분석 설정
 * @type {Object|null}
 */
let _tenureReportSettings = null;

/**
 * 특수부서 localStorage 키
 * @constant
 */
const TENURE_SPECIAL_DEPTS_KEY = 'tenureReport_specialDepts';

// ===== 모듈 초기화 =====

/**
 * 근속현황표 모듈 로드
 * 
 * @description
 * 모듈 컨테이너에 UI를 동적으로 생성합니다.
 */
function loadTenureReportModule() {
    try {
        로거_인사?.debug('근속현황표 모듈 로드 시작');
        
        const container = document.getElementById('module-tenure-report');
        if (!container) {
            로거_인사?.error('근속현황표 컨테이너를 찾을 수 없습니다');
            return;
        }
        
 // 현재 연도 기준 기본값 설정
        const currentYear = new Date().getFullYear();
        const defaultStartYear = currentYear - 2;
        const defaultEndYear = currentYear;
        
 // 부서 목록 가져오기
        const departments = _getUniqueDepartments();
        const employmentTypes = _getUniqueEmploymentTypes();
        
 // 저장된 특수부서 목록 가져오기
        const savedSpecialDepts = _loadSpecialDepts();
        
        const html = `
            <div class="card">
                <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> 근속현황표 설정</div>
                <div class="alert alert-info">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                    <span>복지관 평가용 근속현황표입니다. 분석 기간 동안 각 직원의 월별 근속개월수를 계산합니다.</span>
                </div>
                
                <!-- 분석 기간 설정 -->
                <div style="background:#f8f9fe;padding:16px;border-radius:8px;margin-bottom:16px;">
                    <div style="font-weight:600;margin-bottom:12px;color:#4f46e5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 분석 기간</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>시작 연도 *</label>
                            <select id="tenureStartYear" class="form-control">
                                ${_generateYearOptions(defaultStartYear)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>종료 연도 *</label>
                            <select id="tenureEndYear" class="form-control">
                                ${_generateYearOptions(defaultEndYear)}
                            </select>
                        </div>
                    </div>
                    <div style="font-size:13px;color:#6b7280;margin-top:8px;">
                        ⏱️ 최대 3년(36개월)까지 분석 가능합니다.
                    </div>
                </div>
                
                <!-- 부서 선택 (출력 대상) -->
                <div style="background:#f8f9fe;padding:16px;border-radius:8px;margin-bottom:16px;">
                    <div style="font-weight:600;margin-bottom:12px;color:#4f46e5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg> 부서 선택 (출력 대상)</div>
                    <div style="margin-bottom:8px;">
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureDeptAll(true)">전체선택</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureDeptAll(false)">전체해제</button>
                    </div>
                    <div id="tenureDeptCheckboxes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
                        ${_generateDeptCheckboxes(departments)}
                    </div>
                </div>
                
                <!-- 고용형태 선택 -->
                <div style="background:#f8f9fe;padding:16px;border-radius:8px;margin-bottom:16px;">
                    <div style="font-weight:600;margin-bottom:12px;color:#4f46e5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 고용형태 선택</div>
                    <div style="margin-bottom:8px;">
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureTypeAll(true)">전체선택</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureTypeAll(false)">전체해제</button>
                    </div>
                    <div id="tenureTypeCheckboxes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
                        ${_generateTypeCheckboxes(employmentTypes)}
                    </div>
                </div>
                
                <!-- 특수부서 설정 (근속 계산 제외) -->
                <div style="background:#fef3c7;padding:16px;border-radius:8px;margin-bottom:16px;border:1px solid #f59e0b;">
                    <div style="font-weight:600;margin-bottom:12px;color:#b45309;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> 특수부서 설정 (근속 계산 제외)</div>
                    <div class="alert" style="background:#fffbeb;border:1px solid #fcd34d;margin-bottom:12px;">
                        <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                        <span>
                            <strong>복지관 평가 기준:</strong> 선택한 부서의 근무 기간은 근속에서 제외됩니다.<br>
                            해당 부서에서 다른 부서로 발령된 시점부터 근속이 계산됩니다.<br>
                            <em style="color:#6b7280;">※ 선택한 특수부서는 다음 사용 시 자동으로 기억됩니다.</em>
                        </span>
                    </div>
                    <div style="margin-bottom:8px;">
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureSpecialDeptAll(true)">전체선택</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleTenureSpecialDeptAll(false)">전체해제</button>
                    </div>
                    <div id="tenureSpecialDeptCheckboxes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;">
                        ${_generateSpecialDeptCheckboxes(departments, savedSpecialDepts)}
                    </div>
                </div>
                
                <!-- 집계 옵션 -->
                <div style="background:#f8f9fe;padding:16px;border-radius:8px;margin-bottom:16px;">
                    <div style="font-weight:600;margin-bottom:12px;color:#4f46e5;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 집계 옵션</div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="tenureShow30Months" checked style="width:16px;height:16px;">
                            <span>30개월 이상 근속자 수 표시</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="tenureShowMonthlyCount" checked style="width:16px;height:16px;">
                            <span>월별 확보 직원 수 표시</span>
                        </label>
                    </div>
                </div>
                
                <!-- 생성 버튼 -->
                <button class="btn btn-primary" style="width:100%;" onclick="generateTenureReport()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 근속현황표 생성
                </button>
            </div>
            
            <!-- 결과 영역 -->
            <div id="tenureReportResult"></div>
        `;
        
        container.innerHTML = html;
        
        로거_인사?.info('근속현황표 모듈 로드 완료');
        
    } catch (error) {
        console.error('[근속현황표] 모듈 로드 오류:', error);
        로거_인사?.error('근속현황표 모듈 로드 실패', error);
    }
}

// ===== 특수부서 관리 =====

/**
 * 저장된 특수부서 목록 로드
 * @private
 * @returns {Array} 특수부서 목록
 */
function _loadSpecialDepts() {
    try {
        const saved = localStorage.getItem(TENURE_SPECIAL_DEPTS_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        로거_인사?.warn('특수부서 목록 로드 오류', error);
    }
    return [];
}

/**
 * 특수부서 목록 저장
 * @private
 * @param {Array} depts 특수부서 목록
 */
function _saveSpecialDepts(depts) {
    try {
        localStorage.setItem(TENURE_SPECIAL_DEPTS_KEY, JSON.stringify(depts));
        로거_인사?.debug('특수부서 목록 저장', { count: depts.length });
    } catch (error) {
        로거_인사?.warn('특수부서 목록 저장 오류', error);
    }
}

/**
 * 특수부서 체크박스 HTML 생성
 * @private
 */
function _generateSpecialDeptCheckboxes(departments, savedSpecialDepts) {
    if (departments.length === 0) {
        return '<div style="color:#9ca3af;">등록된 부서가 없습니다.</div>';
    }
    
    return departments.map(dept => {
        const safeDept = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml(dept) 
            : dept;
        const isChecked = savedSpecialDepts.includes(dept) ? 'checked' : '';
        return `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px;">
                <input type="checkbox" class="tenure-special-dept-checkbox" value="${safeDept}" ${isChecked} style="width:16px;height:16px;">
                <span style="font-size:14px;">${safeDept}</span>
            </label>
        `;
    }).join('');
}

/**
 * 특수부서 전체 선택/해제
 */
function toggleTenureSpecialDeptAll(checked) {
    const checkboxes = document.querySelectorAll('.tenure-special-dept-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    로거_인사?.debug('특수부서 전체 토글', { checked, count: checkboxes.length });
}

// ===== 헬퍼 함수: UI 생성 =====

/**
 * 연도 옵션 HTML 생성
 * @private
 * @description
 * - 시작연도: DB에서 가장 빠른 입사일 기준 (기관 개관 시점)
 * - 종료연도: 현재년도 + 10년 (장기 사용 대비)
 */
function _generateYearOptions(selectedYear) {
    const currentYear = new Date().getFullYear();
    
 // DB에서 가장 빠른 입사년도 찾기
    let minYear = currentYear - 10; // 기본값
    try {
        const employees = db?.getEmployees?.() || [];
        employees.forEach(emp => {
            const entryDate = emp.employment?.entryDate || emp.entryDate;
            if (entryDate) {
                const year = new Date(entryDate).getFullYear();
                if (!isNaN(year) && year < minYear) {
                    minYear = year;
                }
            }
        });
    } catch (e) {
        console.warn('입사년도 조회 실패, 기본값 사용:', e);
    }
    
 // 종료연도: 현재년도 + 10년
    const maxYear = currentYear + 10;
    
    let html = '';
    for (let year = minYear; year <= maxYear; year++) {
        const selected = year === selectedYear ? 'selected' : '';
        html += `<option value="${year}" ${selected}>${year}년</option>`;
    }
    
    return html;
}

/**
 * 부서 체크박스 HTML 생성
 * @private
 */
function _generateDeptCheckboxes(departments) {
    if (departments.length === 0) {
        return '<div style="color:#9ca3af;">등록된 부서가 없습니다.</div>';
    }
    
    return departments.map(dept => {
        const safeDept = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml(dept) 
            : dept;
        return `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px;">
                <input type="checkbox" class="tenure-dept-checkbox" value="${safeDept}" checked style="width:16px;height:16px;">
                <span style="font-size:14px;">${safeDept}</span>
            </label>
        `;
    }).join('');
}

/**
 * 고용형태 체크박스 HTML 생성
 * @private
 */
function _generateTypeCheckboxes(types) {
    if (types.length === 0) {
        return '<div style="color:#9ca3af;">등록된 고용형태가 없습니다.</div>';
    }
    
    return types.map(type => {
        const safeType = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml(type) 
            : type;
        return `
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px;">
                <input type="checkbox" class="tenure-type-checkbox" value="${safeType}" checked style="width:16px;height:16px;">
                <span style="font-size:14px;">${safeType}</span>
            </label>
        `;
    }).join('');
}

/**
 * 고유 부서 목록 가져오기
 * @private
 */
function _getUniqueDepartments() {
    try {
        const employees = db.getEmployees();
        const depts = new Set();
        
        employees.forEach(emp => {
 // 현재 부서
            const dept = 직원유틸_인사?.getDepartment(emp) || emp.currentPosition?.dept || emp.dept;
            if (dept && dept !== '부서 미지정') {
                depts.add(dept);
            }
            
 // 발령 이력에서 부서 추출
            const assignments = emp.assignments || [];
            assignments.forEach(assign => {
                if (assign.dept && assign.dept !== '부서 미지정') {
                    depts.add(assign.dept);
                }
            });
        });
        
        return Array.from(depts).sort();
    } catch (error) {
        로거_인사?.error('부서 목록 조회 오류', error);
        return [];
    }
}

/**
 * 고유 고용형태 목록 가져오기
 * @private
 */
function _getUniqueEmploymentTypes() {
    try {
        const employees = db.getEmployees();
        const types = new Set();
        
        employees.forEach(emp => {
            const type = 직원유틸_인사?.getEmploymentType(emp) || emp.employment?.type || emp.employmentType;
            if (type) {
                types.add(type);
            }
        });
        
 // 기본 고용형태가 없으면 추가
        const defaultTypes = ['정규직', '무기계약직', '계약직', '육아휴직대체'];
        defaultTypes.forEach(t => types.add(t));
        
        return Array.from(types).sort();
    } catch (error) {
        로거_인사?.error('고용형태 목록 조회 오류', error);
        return ['정규직', '무기계약직', '계약직', '육아휴직대체'];
    }
}

// ===== 체크박스 토글 =====

/**
 * 부서 전체 선택/해제
 */
function toggleTenureDeptAll(checked) {
    const checkboxes = document.querySelectorAll('.tenure-dept-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    로거_인사?.debug('부서 전체 토글', { checked, count: checkboxes.length });
}

/**
 * 고용형태 전체 선택/해제
 */
function toggleTenureTypeAll(checked) {
    const checkboxes = document.querySelectorAll('.tenure-type-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    로거_인사?.debug('고용형태 전체 토글', { checked, count: checkboxes.length });
}

// ===== 근속현황표 생성 =====

/**
 * 근속현황표 생성
 */
function generateTenureReport() {
    try {
        로거_인사?.info('근속현황표 생성 시작');
        
 // 1. 설정값 가져오기
        const startYear = parseInt(document.getElementById('tenureStartYear').value);
        const endYear = parseInt(document.getElementById('tenureEndYear').value);
        
 // 유효성 검사
        if (startYear > endYear) {
            alert('[주의] 시작 연도는 종료 연도보다 작거나 같아야 합니다.');
            return;
        }
        
        if (endYear - startYear > 2) {
            alert('[주의] 분석 기간은 최대 3년(36개월)까지 가능합니다.');
            return;
        }
        
 // 선택된 부서
        const selectedDepts = Array.from(document.querySelectorAll('.tenure-dept-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedDepts.length === 0) {
            alert('[주의] 최소 1개 이상의 부서를 선택하세요.');
            return;
        }
        
 // 선택된 고용형태
        const selectedTypes = Array.from(document.querySelectorAll('.tenure-type-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedTypes.length === 0) {
            alert('[주의] 최소 1개 이상의 고용형태를 선택하세요.');
            return;
        }
        
 // 선택된 특수부서 (저장)
        const specialDepts = Array.from(document.querySelectorAll('.tenure-special-dept-checkbox:checked'))
            .map(cb => cb.value);
        _saveSpecialDepts(specialDepts);
        
 // 집계 옵션
        const show30Months = document.getElementById('tenureShow30Months').checked;
        const showMonthlyCount = document.getElementById('tenureShowMonthlyCount').checked;
        
 // 설정 저장
        _tenureReportSettings = {
            startYear,
            endYear,
            selectedDepts,
            selectedTypes,
            specialDepts,
            show30Months,
            showMonthlyCount
        };
        
        로거_인사?.debug('분석 설정', _tenureReportSettings);
        
 // 2. 직원 데이터 필터링
        const employees = db.getEmployees();
        const periodStartDate = new Date(startYear, 0, 1);
        const periodEndDate = new Date(endYear, 11, 31);
        
 // 분석 대상 직원 필터링
        const filteredEmployees = employees.filter(emp => {
 // 부서 필터
            const dept = 직원유틸_인사?.getDepartment(emp) || emp.currentPosition?.dept || emp.dept || '';
            if (!selectedDepts.includes(dept)) return false;
            
 // 고용형태 필터
            const type = 직원유틸_인사?.getEmploymentType(emp) || emp.employment?.type || emp.employmentType || '';
            if (!selectedTypes.includes(type)) return false;
            
 // 입사일 확인
            const entryDateStr = 직원유틸_인사?.getEntryDate(emp) || emp.employment?.entryDate || emp.entryDate;
            if (!entryDateStr || entryDateStr === '-') return false;
            
            const entryDate = new Date(entryDateStr);
            
 // 퇴사자인 경우: 퇴사일이 분석 기간 시작일 이전이면 제외
            const retireDateStr = 직원유틸_인사?.getRetirementDate(emp) || emp.employment?.retirementDate || emp.retirementDate;
            if (retireDateStr) {
                const retireDate = new Date(retireDateStr);
                if (retireDate < periodStartDate) return false;
            }
            
 // 입사일이 분석 기간 종료일 이후면 제외
            if (entryDate > periodEndDate) return false;
            
            return true;
        });
        
        if (filteredEmployees.length === 0) {
            alert('ℹ️ 조건에 해당하는 직원이 없습니다.');
            return;
        }
        
        로거_인사?.debug('필터링된 직원 수', { count: filteredEmployees.length });
        
 // 3. 근속 데이터 계산 (특수부서 적용)
        const reportData = _calculateTenureData(filteredEmployees, startYear, endYear, specialDepts);
        _tenureReportData = reportData;
        
 // 4. 테이블 HTML 생성
        const tableHTML = _generateTenureTableHTML(reportData, startYear, endYear, show30Months, showMonthlyCount);
        
 // 5. 결과 표시
        const resultContainer = document.getElementById('tenureReportResult');
        if (resultContainer) {
            const specialDeptInfo = specialDepts.length > 0 
                ? `<br>제외 부서(근속 제외): ${specialDepts.join(', ')}`
                : '';
            
            resultContainer.innerHTML = `
                <div class="card">
                    <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> 근속현황표 (${startYear}년~${endYear}년) - 총 ${reportData.employees.length}명</div>
                    <div style="overflow-x:auto;">
                        ${tableHTML}
                    </div>
                    <div class="alert alert-info" style="margin-top:20px;">
                        <span>ℹ️</span>
                        <span>
                            <strong>표시 설명:</strong><br>
                            • 근속개월수는 <strong>근속시작일</strong> 기준, 매월 같은 날짜에 1개월씩 증가합니다.<br>
                            • <span style="color:#ea580c;font-weight:600;">▸ 주황색 근속시작일</span>: 특수부서 이력이 있어 입사일과 다른 경우<br>
                            • "-"는 해당 시점에 퇴사했거나 아직 입사 전임을 의미합니다.<br>
                            • 연말 기준 열은 각 연도 12월 31일 기준 근속개월수입니다.${specialDeptInfo}
                        </span>
                    </div>
                    <div style="margin-top:20px;text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="printTenureReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
                        <button class="btn btn-success" onclick="exportTenureReportToExcel()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀 다운로드</button>
                    </div>
                </div>
            `;
            
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
        로거_인사?.info('근속현황표 생성 완료', { 
            employeeCount: reportData.employees.length,
            period: `${startYear}~${endYear}`,
            specialDepts: specialDepts.length
        });
        
    } catch (error) {
        console.error('[근속현황표] 생성 오류:', error);
        로거_인사?.error('근속현황표 생성 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '근속현황표 생성 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 근속현황표 생성 중 오류가 발생했습니다.');
        }
    }
}

// ===== 근속 데이터 계산 =====

/**
 * 근속 데이터 계산
 * @private
 * @param {Array} employees 직원 목록
 * @param {number} startYear 시작 연도
 * @param {number} endYear 종료 연도
 * @param {Array} specialDepts 특수부서 목록
 */
function _calculateTenureData(employees, startYear, endYear, specialDepts) {
    const result = {
        employees: [],
        summary: {
            longTermCount: {},  // 연도별 30개월 이상 근속자 수
            yearlyCount: {},    // 연도별 확보 직원 수
            monthlyCount: {}    // 월별 확보 직원 수
        }
    };
    
 // 직원별 데이터 계산
    employees.forEach(emp => {
        const empData = _calculateEmployeeTenure(emp, startYear, endYear, specialDepts);
        if (empData) {
            result.employees.push(empData);
        }
    });
    
 // 정렬: 근속시작일순 → 이름 가나다순
    result.employees.sort((a, b) => {
 // 1. 근속시작일 비교
        const tenureStartA = new Date(a.tenureStartDate);
        const tenureStartB = new Date(b.tenureStartDate);
        
        if (tenureStartA.getTime() !== tenureStartB.getTime()) {
            return tenureStartA - tenureStartB;
        }
        
 // 2. 근속시작일이 같으면 이름 가나다순
        return a.name.localeCompare(b.name, 'ko');
    });
    
 // 집계 계산
    _calculateSummary(result, startYear, endYear);
    
    return result;
}

/**
 * 개별 직원 근속 데이터 계산
 * @private
 */
function _calculateEmployeeTenure(emp, startYear, endYear, specialDepts) {
    try {
        const name = 직원유틸_인사?.getName(emp) || emp.personalInfo?.name || emp.name || '이름없음';
        const dept = 직원유틸_인사?.getDepartment(emp) || emp.currentPosition?.dept || emp.dept || '';
        const employmentType = 직원유틸_인사?.getEmploymentType(emp) || emp.employment?.type || emp.employmentType || '';
        const entryDateStr = 직원유틸_인사?.getEntryDate(emp) || emp.employment?.entryDate || emp.entryDate;
        const retireDateStr = 직원유틸_인사?.getRetirementDate(emp) || emp.employment?.retirementDate || emp.retirementDate;
        
        if (!entryDateStr || entryDateStr === '-') return null;
        
        const entryDate = new Date(entryDateStr);
        const retireDate = retireDateStr ? new Date(retireDateStr) : null;
        
 // 근속시작일 계산 (특수부서 적용)
        const tenureStartDate = _calculateTenureStartDate(emp, entryDate, specialDepts);
        const tenureStartDateStr = tenureStartDate.toISOString().split('T')[0];
        
 // 입사일과 근속시작일이 다른지 확인
        const isDifferentStart = tenureStartDateStr !== entryDateStr;
        
        const empData = {
            id: emp.id,
            uniqueCode: emp.uniqueCode || '',
            name,
            dept,
            employmentType,
            entryDate: entryDateStr,
            tenureStartDate: tenureStartDateStr,
            isDifferentStart,  // 입사일과 근속시작일이 다른지 여부
            retireDate: retireDateStr || '',
            yearEndTenure: {},  // 연말 기준 근속개월수
            monthlyTenure: {}   // 월별 근속개월수
        };
        
 // 연말 기준 근속개월수 계산 (각 연도 12월 31일)
        for (let year = startYear; year <= endYear; year++) {
            const yearEnd = new Date(year, 11, 31);
            
 // 퇴사자: 퇴사일 이전인 경우만 계산
            if (retireDate && retireDate < yearEnd) {
                empData.yearEndTenure[year] = '-';
            } else if (tenureStartDate > yearEnd) {
 // 근속시작일이 연말 이후면 아직 근속 시작 전
                empData.yearEndTenure[year] = '';
            } else {
                const months = _calculateTenureMonths(tenureStartDate, yearEnd);
                empData.yearEndTenure[year] = months > 0 ? months : '';
            }
        }
        
 // 월별 근속개월수 계산
        for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month < 12; month++) {
                const monthEnd = new Date(year, month + 1, 0); // 해당 월 마지막 날
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                
 // 퇴사자: 퇴사일 이후는 빈칸
                if (retireDate && retireDate < monthEnd) {
                    empData.monthlyTenure[key] = '';
                } else if (tenureStartDate > monthEnd) {
                    empData.monthlyTenure[key] = '';
                } else {
                    const months = _calculateTenureMonths(tenureStartDate, monthEnd);
                    empData.monthlyTenure[key] = months > 0 ? months : '';
                }
            }
        }
        
        return empData;
        
    } catch (error) {
        로거_인사?.error('직원 근속 계산 오류', { emp: emp?.id, error: error.message });
        return null;
    }
}

/**
 * 근속시작일 계산 (특수부서 적용)
 * @private
 * @param {Object} emp 직원 데이터
 * @param {Date} entryDate 입사일
 * @param {Array} specialDepts 특수부서 목록
 * @returns {Date} 근속시작일
 */
function _calculateTenureStartDate(emp, entryDate, specialDepts) {
 // 특수부서가 없으면 입사일 반환
    if (!specialDepts || specialDepts.length === 0) {
        return entryDate;
    }
    
 // 발령 이력 가져오기
    const assignments = emp.assignments || [];
    
    if (assignments.length === 0) {
 // 발령 이력이 없으면 현재 부서로 판단
        const currentDept = 직원유틸_인사?.getDepartment(emp) || emp.currentPosition?.dept || emp.dept || '';
        
 // 현재 부서가 특수부서면 입사일 반환 (근속 시작 안함)
 // 현재 부서가 일반부서면 입사일 반환 (입사일부터 근속)
        return entryDate;
    }
    
 // 발령 이력을 날짜순으로 정렬
    const sortedAssignments = [...assignments].sort((a, b) => {
        const dateA = new Date(a.startDate || a.date || '9999-12-31');
        const dateB = new Date(b.startDate || b.date || '9999-12-31');
        return dateA - dateB;
    });
    
 // 특수부서에서 일반부서로 처음 발령된 날짜 찾기
    let wasInSpecialDept = false;
    let tenureStartDate = entryDate;
    
 // 입사 시 부서가 특수부서인지 확인
    const firstAssignment = sortedAssignments[0];
    if (firstAssignment) {
        const firstDept = firstAssignment.dept || '';
        wasInSpecialDept = specialDepts.includes(firstDept);
    }
    
 // 발령 이력 순회
    for (const assign of sortedAssignments) {
        const assignDept = assign.dept || '';
        const assignDate = new Date(assign.startDate || assign.date);
        
        if (wasInSpecialDept && !specialDepts.includes(assignDept)) {
 // 특수부서 → 일반부서로 발령: 이 날짜가 근속시작일
            tenureStartDate = assignDate;
            wasInSpecialDept = false;
            break;  // 첫 번째 일반부서 발령일이 근속시작일
        } else if (specialDepts.includes(assignDept)) {
 // 특수부서로 발령
            wasInSpecialDept = true;
        }
    }
    
 // 계속 특수부서에만 있었다면 (일반부서 발령이 없었다면)
 // 마지막 발령일 또는 입사일 반환
    if (wasInSpecialDept) {
 // 현재도 특수부서에 있으므로 근속 계산 대상 아님
 // 하지만 표에는 나와야 하므로 입사일 반환 (근속 0)
        return new Date('9999-12-31');  // 매우 먼 미래 → 모든 근속이 0 또는 빈칸
    }
    
    return tenureStartDate;
}

/**
 * 근속개월수 계산
 * @private
 */
function _calculateTenureMonths(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    if (endDate < startDate) return 0;
    
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    
 // 년/월 차이 계산
    let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
    
 // 일 비교: 입사일보다 작으면 아직 해당 월 미도달
    if (endDay < startDay) {
        totalMonths--;
    }
    
    return Math.max(0, totalMonths);
}

/**
 * 집계 데이터 계산
 * @private
 */
function _calculateSummary(result, startYear, endYear) {
 // 연도별 집계 초기화
    for (let year = startYear; year <= endYear; year++) {
        result.summary.longTermCount[year] = 0;
        result.summary.yearlyCount[year] = 0;
    }
    
 // 월별 집계 초기화
    for (let year = startYear; year <= endYear; year++) {
        for (let month = 1; month <= 12; month++) {
            const key = `${year}-${String(month).padStart(2, '0')}`;
            result.summary.monthlyCount[key] = 0;
        }
    }
    
 // 직원별로 집계
    result.employees.forEach(emp => {
 // 연말 기준 집계
        for (let year = startYear; year <= endYear; year++) {
            const tenure = emp.yearEndTenure[year];
            if (tenure !== '' && tenure !== '-') {
                result.summary.yearlyCount[year]++;
                if (tenure >= 30) {
                    result.summary.longTermCount[year]++;
                }
            }
        }
        
 // 월별 집계
        for (let year = startYear; year <= endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                const key = `${year}-${String(month).padStart(2, '0')}`;
                const tenure = emp.monthlyTenure[key];
                if (tenure !== '' && tenure !== '-') {
                    result.summary.monthlyCount[key]++;
                }
            }
        }
    });
}

// ===== 테이블 HTML 생성 =====

/**
 * 테이블 HTML 생성
 * @private
 */
function _generateTenureTableHTML(data, startYear, endYear, show30Months, showMonthlyCount) {
    const totalMonths = (endYear - startYear + 1) * 12;
    
 // 월별 헤더 생성
    const monthHeaders = [];
    for (let year = startYear; year <= endYear; year++) {
        for (let month = 1; month <= 12; month++) {
            monthHeaders.push(`${year}-${String(month).padStart(2, '0')}`);
        }
    }
    
 // 월별 헤더 생성은 위에서 완료
    
    let html = `
        <style>
            .tenure-table-wrap {
                max-height: 70vh;
                overflow: scroll !important;
                border: 1px solid #e8ebed;
                border-radius: 8px;
                position: relative;
            }
            .tenure-table {
                border-collapse: separate;
                border-spacing: 0;
                font-size: 11px;
                width: max-content;
                overflow: visible !important;
            }
            .tenure-table th,
            .tenure-table td {
                padding: 8px;
                border: 1px solid #d1d5db;
                white-space: nowrap;
                text-align: center;
                box-sizing: border-box;
            }
 /* 헤더 세로 고정 */
            .tenure-table thead th {
                position: -webkit-sticky;
                position: sticky;
                top: 0;
                background: #5b6abf;
                color: white;
                z-index: 10;
            }
 /* 좌측 컬럼 가로 고정 */
            .tenure-table .sticky-col {
                position: -webkit-sticky;
                position: sticky;
                z-index: 5;
            }
 /* 헤더의 좌측 컬럼 (교차점) - 가장 높은 z-index */
            .tenure-table thead .sticky-col {
                z-index: 20;
            }
            .tenure-table .sticky-0 { left: 0px; }
            .tenure-table .sticky-1 { left: 40px; }
            .tenure-table .sticky-2 { left: 130px; }
            .tenure-table .sticky-3 { left: 190px; }
            .tenure-table .sticky-4 { left: 265px; }
            .tenure-table .sticky-5 { left: 355px; }
            .tenure-table .sticky-6 { left: 465px; box-shadow: 3px 0 5px rgba(0,0,0,0.15); }
            .tenure-table .row-even { background: #ffffff; }
            .tenure-table .row-odd { background: #f9fafb; }
            .tenure-table .year-end-header { background: #6366f1 !important; }
        </style>
        <div class="tenure-table-wrap" id="tenureTableContainer">
        <table class="tenure-table" id="tenureReportTable">
            <thead>
                <tr>
                    <th class="sticky-col sticky-0" style="min-width:40px;">No</th>
                    <th class="sticky-col sticky-1" style="min-width:90px;">부서</th>
                    <th class="sticky-col sticky-2" style="min-width:60px;">성명</th>
                    <th class="sticky-col sticky-3" style="min-width:75px;">고용형태</th>
                    <th class="sticky-col sticky-4" style="min-width:90px;">입사일</th>
                    <th class="sticky-col sticky-5" style="min-width:110px;">근속시작일</th>
                    <th class="sticky-col sticky-6" style="min-width:85px;">퇴사일</th>
    `;
    
 // 연말 기준 헤더
    for (let year = startYear; year <= endYear; year++) {
        html += `<th class="year-end-header" style="min-width:55px;">${year}년말</th>`;
    }
    
 // 월별 헤더
    monthHeaders.forEach(header => {
        html += `<th style="min-width:60px;">${header}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
 // 직원 데이터 행
    data.employees.forEach((emp, index) => {
        const safeName = typeof DOM유틸_인사 !== 'undefined' ? DOM유틸_인사.escapeHtml(emp.name) : emp.name;
        const safeDept = typeof DOM유틸_인사 !== 'undefined' ? DOM유틸_인사.escapeHtml(emp.dept) : emp.dept;
        const safeType = typeof DOM유틸_인사 !== 'undefined' ? DOM유틸_인사.escapeHtml(emp.employmentType) : emp.employmentType;
        
 // 근속시작일 스타일 (입사일과 다르면 주황색)
        const tenureStartStyle = emp.isDifferentStart ? 'color:#ea580c;font-weight:600;' : '';
        const tenureStartPrefix = emp.isDifferentStart ? '▸' : '';
        
 // 근속시작일이 9999년이면 특수부서만 근무
        const displayTenureStart = emp.tenureStartDate === '9999-12-31' 
            ? '<span style="color:#9ca3af;">-</span>' 
            : `${tenureStartPrefix}${emp.tenureStartDate}`;
        
        const rowClass = index % 2 === 0 ? 'row-even' : 'row-odd';
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        
        html += `<tr class="${rowClass}">
            <td class="sticky-col sticky-0" style="background:${rowBg};">${index + 1}</td>
            <td class="sticky-col sticky-1" style="background:${rowBg};">${safeDept}</td>
            <td class="sticky-col sticky-2" style="background:${rowBg};font-weight:600;">${safeName}</td>
            <td class="sticky-col sticky-3" style="background:${rowBg};">${safeType}</td>
            <td class="sticky-col sticky-4" style="background:${rowBg};">${emp.entryDate}</td>
            <td class="sticky-col sticky-5" style="background:${rowBg};${tenureStartStyle}">${displayTenureStart}</td>
            <td class="sticky-col sticky-6" style="background:${rowBg};">${emp.retireDate || ''}</td>`;
        
 // 연말 기준 데이터
        for (let year = startYear; year <= endYear; year++) {
            const tenure = emp.yearEndTenure[year];
            const bgColor = tenure >= 30 ? '#dcfce7' : '';
            html += `<td style="${bgColor ? 'background:'+bgColor+';' : ''}font-weight:${tenure >= 30 ? '600' : '400'};">${tenure}</td>`;
        }
        
 // 월별 데이터
        monthHeaders.forEach(key => {
            const tenure = emp.monthlyTenure[key];
            html += `<td>${tenure}</td>`;
        });
        
        html += `</tr>`;
    });
    
 // 집계 행: 30개월 이상 근속자 수
    if (show30Months) {
        const summaryBg1 = '#fef3c7';
        html += `<tr style="font-weight:600;">
            <td class="sticky-col sticky-0" style="background:${summaryBg1};"></td>
            <td class="sticky-col sticky-1" style="background:${summaryBg1};"></td>
            <td class="sticky-col sticky-2" style="background:${summaryBg1};font-size:10px;text-align:left;" colspan="2">30개월 이상</td>
            <td class="sticky-col sticky-4" style="background:${summaryBg1};"></td>
            <td class="sticky-col sticky-5" style="background:${summaryBg1};font-size:10px;">근속자 수</td>
            <td class="sticky-col sticky-6" style="background:${summaryBg1};"></td>`;
        
        for (let year = startYear; year <= endYear; year++) {
            html += `<td style="background:${summaryBg1};">${data.summary.longTermCount[year]}</td>`;
        }
        
        monthHeaders.forEach(() => {
            html += `<td style="background:${summaryBg1};"></td>`;
        });
        
        html += `</tr>`;
    }
    
 // 집계 행: 확보 직원 수
    if (showMonthlyCount) {
        const summaryBg2 = '#dbeafe';
        html += `<tr style="font-weight:600;">
            <td class="sticky-col sticky-0" style="background:${summaryBg2};"></td>
            <td class="sticky-col sticky-1" style="background:${summaryBg2};"></td>
            <td class="sticky-col sticky-2" style="background:${summaryBg2};font-size:10px;text-align:left;" colspan="2">확보</td>
            <td class="sticky-col sticky-4" style="background:${summaryBg2};"></td>
            <td class="sticky-col sticky-5" style="background:${summaryBg2};font-size:10px;">직원 수</td>
            <td class="sticky-col sticky-6" style="background:${summaryBg2};"></td>`;
        
        for (let year = startYear; year <= endYear; year++) {
            html += `<td style="background:${summaryBg2};">${data.summary.yearlyCount[year]}</td>`;
        }
        
        monthHeaders.forEach(key => {
            html += `<td style="background:${summaryBg2};">${data.summary.monthlyCount[key]}</td>`;
        });
        
        html += `</tr>`;
    }
    
    html += `</tbody></table>
        </div>`;
    
    return html;
}

// ===== 인쇄 =====

/**
 * 근속현황표 인쇄 옵션 모달 표시
 */
function printTenureReport() {
    try {
        const table = document.getElementById('tenureReportTable');
        if (!table) {
            alert('[주의] 먼저 근속현황표를 생성하세요.');
            return;
        }
        
 // 인쇄 옵션 모달 표시
        const modal = document.createElement('div');
        modal.id = 'tenure-print-options-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    min-width: 320px;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 근속현황표 인쇄 설정
                    </h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="tenure-print-show-title" checked 
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 14px; color: #374151;">제목 표시</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="tenure-print-show-date" checked
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 14px; color: #374151;">생성일 표시</span>
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                            용지 크기
                        </label>
                        <select id="tenure-print-paper" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                        ">
                            <option value="A4">A4</option>
                            <option value="A3">A3 (넓은 표에 적합)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                            용지 방향
                        </label>
                        <select id="tenure-print-orientation" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                        ">
                            <option value="landscape" selected>가로 (권장)</option>
                            <option value="portrait">세로</option>
                        </select>
                        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
 * 근속현황표는 컬럼이 많아 가로 방향 권장
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="document.getElementById('tenure-print-options-modal').remove()" style="
                            padding: 10px 20px;
                            border: 1px solid #d1d5db;
                            background: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                        ">취소</button>
                        <button onclick="executeTenurePrint()" style="
                            padding: 10px 20px;
                            border: none;
                            background: linear-gradient(135deg, #4f46e5, #764ba2);
                            color: white;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">인쇄</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('[근속현황표] 인쇄 옵션 모달 오류:', error);
 // 폴백: 기본 인쇄 실행
        executeTenurePrint();
    }
}

/**
 * 근속현황표 실제 인쇄 실행
 */
function executeTenurePrint() {
    try {
        로거_인사?.info('근속현황표 인쇄 시작');
        
 // 옵션 가져오기
        const showTitle = document.getElementById('tenure-print-show-title')?.checked ?? true;
        const showDate = document.getElementById('tenure-print-show-date')?.checked ?? true;
        const paperSize = document.getElementById('tenure-print-paper')?.value || 'A4';
        const orientation = document.getElementById('tenure-print-orientation')?.value || 'landscape';
        
 // 모달 닫기
        document.getElementById('tenure-print-options-modal')?.remove();
        
        const table = document.getElementById('tenureReportTable');
        if (!table) {
            alert('[주의] 먼저 근속현황표를 생성하세요.');
            return;
        }
        
 // 테이블 복제
        const tableClone = table.cloneNode(true);
        
 // 제목 생성
        const settings = _tenureReportSettings;
        const titleText = `근속현황표 (${settings?.startYear || ''}년~${settings?.endYear || ''}년)`;
        const specialDeptInfo = settings?.specialDepts?.length > 0 
            ? `<div style="font-size:11px;color:#666;margin-bottom:5px;">특수부서(근속 제외): ${settings.specialDepts.join(', ')}</div>`
            : '';
        
        let titleHTML = '';
        if (showTitle) {
            titleHTML = `<h2 style="text-align:center;margin-bottom:10px;font-size:16px;">${titleText}</h2>${specialDeptInfo}`;
        }
        
        let dateHTML = '';
        if (showDate) {
            const today = DateUtils ? DateUtils.formatDate(new Date()) : new Date().toISOString().split('T')[0];
            dateHTML = `<div style="text-align:right;margin-bottom:10px;font-size:11px;color:#666;">생성일: ${today}</div>`;
        }
        
        const fontSize = paperSize === 'A3' ? '9px' : '7px';
        const cellPadding = paperSize === 'A3' ? '3px 4px' : '2px 3px';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>근속현황표 인쇄</title>
                <style>
                    @page { size: ${paperSize} ${orientation}; margin: 5mm; }
                    body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 10px; }
                    table { font-size: ${fontSize}; border-collapse: collapse; width: 100%; table-layout: auto; }
                    th, td { padding: ${cellPadding}; border: 1px solid #333; white-space: nowrap; text-align: center; }
                    th { background: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    .no-print { position: fixed; top: 20px; right: 20px; background: #2196F3; color: white; padding: 12px 24px; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; z-index: 9999; }
                    .no-print:hover { background: #1976D2; }
                    @media print { body { padding: 0; } .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄하기 (Ctrl+P)</button>
                ${titleHTML}
                ${dateHTML}
                ${tableClone.outerHTML}
            </body>
            </html>
        `;
        
 // Electron 환경에서 시스템 브라우저로 열기
        if (window.electronAPI && window.electronAPI.openInBrowser) {
            window.electronAPI.openInBrowser(htmlContent, 'tenure_report_print.html');
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                alert('팝업이 차단되었습니다.');
            }
        }
        
        로거_인사?.info('근속현황표 인쇄 완료');
        
    } catch (error) {
        console.error('[근속현황표] 인쇄 오류:', error);
        로거_인사?.error('근속현황표 인쇄 실패', error);
        alert('[오류] 인쇄 중 오류가 발생했습니다.');
    }
}

// ===== 엑셀 다운로드 =====

/**
 * 근속현황표 엑셀 다운로드
 */
function exportTenureReportToExcel() {
    try {
        로거_인사?.info('근속현황표 엑셀 다운로드 시작');
        
        const table = document.getElementById('tenureReportTable');
        if (!table) {
            alert('[주의] 먼저 근속현황표를 생성하세요.');
            return;
        }
        
 // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            alert('[오류] 엑셀 다운로드 기능을 사용할 수 없습니다.');
            return;
        }
        
 // 엑셀 변환
        const wb = XLSX.utils.table_to_book(table);
        
 // 파일명 생성
        const settings = _tenureReportSettings;
        const today = DateUtils ? DateUtils.formatDate(new Date()) : new Date().toISOString().split('T')[0];
        const filename = `근속현황표_${settings?.startYear || ''}-${settings?.endYear || ''}_${today}.xlsx`;
        
 // 다운로드
        XLSX.writeFile(wb, filename);
        
        로거_인사?.info('근속현황표 엑셀 다운로드 완료', { filename });
        
    } catch (error) {
        console.error('[근속현황표] 엑셀 다운로드 오류:', error);
        로거_인사?.error('근속현황표 엑셀 다운로드 실패', error);
        alert('[오류] 엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

// ===== 모듈 로드 이벤트 =====

/**
 * 페이지 로드 시 초기화
 */
window.addEventListener('DOMContentLoaded', function() {
 // 네비게이션에서 호출될 때 자동 로드되므로 여기서는 별도 처리 없음
    로거_인사?.debug('근속현황표 모듈 스크립트 로드 완료');
});

/**
 * 개발 통계
 * 
 * v1.1.0 구현 기능:
 * 분석 기간 설정 (시작년도~종료년도, 최대 3년)
 * 부서별 필터링 (다중 선택)
 * 고용형태별 필터링 (다중 선택)
 * 특수부서 설정 (근속 계산 제외, localStorage 저장)
 * 근속시작일 컬럼 추가 (입사일과 다를 경우 색상 강조)
 * 발령 이력 기반 근속시작일 계산
 * 월별 근속개월수 계산
 * 연말 기준 근속개월수 표시
 * 집계 행 (30개월 이상 근속자 수)
 * 집계 행 (월별 확보 직원 수)
 * 고용형태 우선순위 정렬
 * 엑셀 다운로드
 * 인쇄 기능 (A4 가로) - 백지 문제 수정
 * XSS 방지
 * 완벽한 에러 처리
 * 체계적 로깅
 * 
 * 의존성:
 * - 데이터베이스_인사.js
 * - 호봉계산기_인사.js
 * - 직원유틸_인사.js
 * - DOM유틸_인사.js
 * - 인쇄유틸_인사.js (선택)
 * - 로거_인사.js
 * - 에러처리_인사.js
 * - XLSX (SheetJS)
 */
