/**
 * 퇴사자목록_인사.js - 프로덕션급 리팩토링
 * 
 * 기간별 퇴사자 목록 보고서 생성
 * - 컬럼 선택기 (20개 항목)
 * - 프리셋 (간략/기본/상세)
 * - 기간별 퇴사자 필터링
 * - 호봉 자동 계산 (퇴사일 기준)
 * - 인쇄 (A4 세로/가로)
 * - 엑셀 다운로드
 * 
 * @version 6.0.1
 * @since 2024-11-05
 * 
 * [변경 이력]
 * v6.0.1 (2026-02-05) 인쇄 헤더 안 보임 버그 수정
 *   - 인쇄 시 헤더 행 인라인 스타일 초기화 (color:white 제거)
 *   - 인쇄 CSS에 th { color: #333 !important } 추가
 *
 * v6.0.0 (2026-01-22) ⭐ 로컬 계산으로 최적화
 *   - API 호출 제거 → 로컬 계산 (퇴사자는 기준일이 각자 다르므로 배치 불가)
 *   - RankCalculator, TenureCalculator 직접 사용
 *   - API 호출 없이 즉시 계산
 * 
 * v5.0.0 (2026-01-22) API 전용 버전
 *   - 직원유틸_인사.getDynamicRankInfo() await 추가
 *   - 모든 계산 로직 서버 API로 이동
 * 
 * v4.0.0 (2026-01-22) API 연동 버전
 *   - RankCalculator.calculateCurrentRank → API_인사.calculateCurrentRank
 *   - TenureCalculator.calculate → API_인사.calculateTenure
 *   - buildRetiredEmployeeRowData() async 변경
 *   - forEach → for...of (async/await 지원)
 * 
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (직원유틸, DOM유틸, 인쇄유틸)
 *   - 인쇄 문제 해결 (사이드바/메뉴 출력 방지)
 *   - ID 기반 인쇄 영역 (retired-employees-print-area)
 *   - 날짜 자동 설정 (올해 1월 1일 ~ 오늘)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - JSDoc 주석 추가
 *   - XSS 방지
 *   - 테이블 가운데 정렬
 * 
 * [인쇄 개선] ⭐ 핵심
 * - ID 기반 인쇄 영역: retired-employees-print-area
 * - 인쇄유틸_인사.print() 사용
 * - 사이드바/메뉴 출력 방지
 * - 제목 포함 인쇄
 * - 테이블만 깔끔하게 인쇄
 * - A4 가로/세로 선택 가능
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 함수 유지
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 검증_인사.js (Validator)
 * - 호봉계산기_인사.js (DateUtils, RankCalculator, TenureCalculator)
 * - 직원유틸_인사.js (직원유틸_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - 인쇄유틸_인사.js (인쇄유틸_인사) - 필수
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - XLSX (SheetJS) - 엑셀 다운로드
 */

// ===== 컬럼 정의 (20개) =====

/**
 * 퇴사자 목록에 사용 가능한 모든 컬럼 정의
 * @constant {Object} RETIRED_COLUMNS
 */
const RETIRED_COLUMNS = {
    no: { label: 'No', default: true, width: '50px' },
    uniqueCode: { label: '고유번호', default: true, width: '80px' },
    name: { label: '성명', default: true, width: '80px' },
    dept: { label: '부서', default: true, width: '100px' },
    position: { label: '직위', default: true, width: '80px' },
    grade: { label: '직급', default: true, width: '80px' },
    jobType: { label: '직종', default: false, width: '80px' },
    employeeNumber: { label: '사원번호', default: false, width: '100px' },
    phone: { label: '전화번호', default: false, width: '110px' },
    email: { label: '이메일', default: false, width: '150px' },
    entryDate: { label: '입사일', default: true, width: '100px' },
    retirementDate: { label: '퇴사일', default: true, width: '100px' },
    tenure: { label: '근속기간', default: true, width: '120px' },
    startRank: { label: '입사호봉', default: false, width: '80px' },
    retiredRank: { label: '퇴사시호봉', default: true, width: '90px' },
    employmentType: { label: '고용형태', default: true, width: '80px' }
};

// ===== 컬럼 선택 UI =====

/**
 * 컬럼 선택 UI HTML 생성
 * 
 * @returns {string} 컬럼 선택기 HTML
 * 
 * @description
 * 20개 컬럼 중 원하는 항목을 선택할 수 있는 UI 생성
 * - 프리셋: 간략/기본/상세
 * - 전체선택/해제
 * - 체크박스 그리드 레이아웃
 * 
 * @example
 * const html = showRetiredColumnSelector();
 */
function showRetiredColumnSelector() {
    로거_인사?.debug('퇴사자 컬럼 선택기 HTML 생성');
    
    try {
        // 체크박스 HTML 생성
        const checkboxes = Object.entries(RETIRED_COLUMNS).map(([key, col]) => {
            // ✅ XSS 방지
            const safeLabel = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.escapeHtml(col.label)
                : col.label;
            
            return `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;transition:background 0.2s;" 
                       onmouseover="this.style.background='#e0e7ff'" 
                       onmouseout="this.style.background='transparent'">
                    <input type="checkbox" 
                           id="retiredCol_${key}" 
                           value="${key}" 
                           ${col.default ? 'checked' : ''}
                           style="width:16px;height:16px;cursor:pointer;">
                    <span style="font-size:14px;">${safeLabel}</span>
                </label>
            `;
        }).join('');
        
        const selectorHTML = `
            <div style="background:#f8f9fe;padding:20px;border-radius:12px;margin-bottom:20px;border:1.5px solid #e8ebed;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="margin:0;font-size:16px;font-weight:600;color:#667eea;">📋 출력 항목 선택</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-secondary btn-small" onclick="applyRetiredColumnPreset('minimal')">간략</button>
                        <button class="btn btn-secondary btn-small" onclick="applyRetiredColumnPreset('default')">기본</button>
                        <button class="btn btn-secondary btn-small" onclick="applyRetiredColumnPreset('detailed')">상세</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleAllRetiredColumns(true)">전체선택</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleAllRetiredColumns(false)">전체해제</button>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
                    ${checkboxes}
                </div>
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e8ebed;">
                    <span style="font-size:13px;color:#6b7280;">💡 항목을 선택한 후 "퇴사자 목록 생성" 버튼을 클릭하세요.</span>
                </div>
            </div>
        `;
        
        로거_인사?.debug('컬럼 선택기 HTML 생성 완료');
        return selectorHTML;
        
    } catch (error) {
        로거_인사?.error('컬럼 선택기 HTML 생성 오류', error);
        return '';
    }
}

/**
 * 프리셋 적용
 * 
 * @param {string} preset - 프리셋 이름 ('minimal', 'default', 'detailed')
 * 
 * @description
 * 미리 정의된 컬럼 조합을 적용
 * - minimal: 5개 (번호, 성명, 부서, 입사일, 퇴사일)
 * - default: 11개 (주요 정보)
 * - detailed: 20개 (전체)
 * 
 * @example
 * applyRetiredColumnPreset('default'); // 기본 프리셋 적용
 */
function applyRetiredColumnPreset(preset) {
    try {
        로거_인사?.debug('프리셋 적용', { preset });
        
        const presets = {
            minimal: ['no', 'name', 'dept', 'entryDate', 'retirementDate'],
            default: ['no', 'uniqueCode', 'name', 'dept', 'position', 'grade', 'entryDate', 'retirementDate', 'tenure', 'retiredRank', 'employmentType'],
            detailed: Object.keys(RETIRED_COLUMNS)
        };
        
        const selected = presets[preset] || presets.default;
        
        Object.keys(RETIRED_COLUMNS).forEach(key => {
            const checkbox = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(`retiredCol_${key}`)
                : document.getElementById(`retiredCol_${key}`);
            
            if (checkbox) {
                checkbox.checked = selected.includes(key);
            }
        });
        
        로거_인사?.info('프리셋 적용 완료', { preset, count: selected.length });
        
    } catch (error) {
        로거_인사?.error('프리셋 적용 오류', error);
    }
}

/**
 * 전체 선택/해제
 * 
 * @param {boolean} checked - true: 전체선택, false: 전체해제
 * 
 * @example
 * toggleAllRetiredColumns(true);  // 전체 선택
 * toggleAllRetiredColumns(false); // 전체 해제
 */
function toggleAllRetiredColumns(checked) {
    try {
        로거_인사?.debug('전체 컬럼 토글', { checked });
        
        Object.keys(RETIRED_COLUMNS).forEach(key => {
            const checkbox = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(`retiredCol_${key}`)
                : document.getElementById(`retiredCol_${key}`);
            
            if (checkbox) {
                checkbox.checked = checked;
            }
        });
        
        로거_인사?.info('전체 컬럼 토글 완료', { 
            checked, 
            count: Object.keys(RETIRED_COLUMNS).length 
        });
        
    } catch (error) {
        로거_인사?.error('전체 컬럼 토글 오류', error);
    }
}

/**
 * 선택된 컬럼 가져오기
 * 
 * @returns {string[]} 선택된 컬럼 키 배열
 * 
 * @example
 * const columns = getSelectedRetiredColumns();
 * console.log(columns); // ['no', 'name', 'dept', ...]
 */
function getSelectedRetiredColumns() {
    try {
        const selected = [];
        
        Object.keys(RETIRED_COLUMNS).forEach(key => {
            const checkbox = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(`retiredCol_${key}`)
                : document.getElementById(`retiredCol_${key}`);
            
            if (checkbox && checkbox.checked) {
                selected.push(key);
            }
        });
        
        로거_인사?.debug('선택된 컬럼', { count: selected.length, columns: selected });
        
        return selected;
        
    } catch (error) {
        로거_인사?.error('선택 컬럼 가져오기 오류', error);
        return [];
    }
}

// ===== 퇴사자 목록 생성 =====

/**
 * 퇴사자 목록 생성
 * 
 * @description
 * 기간별 퇴사자 목록을 테이블로 생성
 * - 시작일/종료일 입력 확인
 * - 날짜 검증
 * - 퇴사자 필터링 (퇴사일이 시작일 이후, 종료일 이전)
 * - 퇴사일 순 정렬
 * - 테이블 HTML 생성
 * - 인쇄/다운로드 버튼 추가
 * 
 * @important
 * 퇴사일 = 마지막 근무일
 * 실제 퇴사 발생일 = 퇴사일 + 1일
 * 예: 퇴사일 2024-12-31 = 2024-12-31까지 근무, 2025-01-01부터 퇴사
 * 따라서 퇴사일 = 종료일인 경우 제외 (기간 내 마지막까지 근무)
 * 
 * @example
 * generateRetiredList(); // 퇴사자 목록 생성
 */
async function generateRetiredList() {
    try {
        로거_인사?.info('퇴사자 목록 생성 시작');
        
        // 1. 날짜 필드 확인
        const startDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredStartDate')
            : document.getElementById('retiredStartDate');
        
        const endDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredEndDate')
            : document.getElementById('retiredEndDate');
        
        if (!startDateField || !endDateField) {
            로거_인사?.warn('날짜 필드를 찾을 수 없음');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('날짜 필드를 찾을 수 없습니다.');
            } else {
                alert('⚠️ 날짜 필드를 찾을 수 없습니다.');
            }
            return;
        }
        
        const startDate = startDateField.value;
        const endDate = endDateField.value;
        
        if (!startDate || !endDate) {
            로거_인사?.warn('날짜 미입력');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('시작일과 종료일을 모두 선택하세요.');
            } else {
                alert('⚠️ 시작일과 종료일을 모두 선택하세요.');
            }
            return;
        }
        
        로거_인사?.debug('날짜 확인', { startDate, endDate });
        
        // 2. 날짜 검증
        if (!Validator.isValidDate(startDate) || !Validator.isValidDate(endDate)) {
            로거_인사?.warn('날짜 형식 오류');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('날짜 형식이 올바르지 않습니다.');
            } else {
                alert('⚠️ 날짜 형식이 올바르지 않습니다.');
            }
            return;
        }
        
        if (Validator.isDateAfter(startDate, endDate)) {
            로거_인사?.warn('날짜 순서 오류', { startDate, endDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('시작일이 종료일보다 늦습니다.\n\n날짜를 확인해주세요.');
            } else {
                alert('⚠️ 시작일이 종료일보다 늦습니다.\n\n날짜를 확인해주세요.');
            }
            return;
        }
        
        // 3. 퇴사자 필터링
        // ⚠️ 중요: 퇴사일 = 마지막 근무일
        // 실제 퇴사 발생일 = 퇴사일 + 1일
        // 예: 퇴사일 2024-12-31 = 2024-12-31까지 근무, 2025-01-01부터 퇴사
        const retiredEmployees = db.getEmployees().filter(emp => {
            const retirementDate = emp.employment?.retirementDate;
            if (!retirementDate) return false; // 재직자 제외
            
            // ⭐ 핵심: 퇴사일 다음날 = 실제 퇴사 상태 시작일
            // 퇴사 발생일이 검색 기간 내에 있으면 포함
            try {
                const retirementDateObj = new Date(retirementDate + 'T00:00:00');
                retirementDateObj.setDate(retirementDateObj.getDate() + 1);
                const actualRetirementDate = DateUtils.formatDate(retirementDateObj);
                
                // 퇴사 발생일이 검색 기간 내에 있으면 포함
                return actualRetirementDate >= startDate && actualRetirementDate <= endDate;
                
            } catch (e) {
                로거_인사?.error('퇴사일 계산 오류', { 
                    employee: emp.uniqueCode, 
                    retirementDate,
                    error: e.message 
                });
                return false;
            }
        });
        
        로거_인사?.debug('퇴사자 필터링 완료', { 
            total: db.getEmployees().length,
            retired: retiredEmployees.length 
        });
        
        if (retiredEmployees.length === 0) {
            const message = `📋 ${startDate} ~ ${endDate} 기간 동안 퇴사한 직원이 없습니다.`;
            로거_인사?.info('퇴사자 없음');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.info(message);
            } else {
                alert(message);
            }
            
            const resultContainer = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById('retiredListResult')
                : document.getElementById('retiredListResult');
            
            if (resultContainer) {
                resultContainer.innerHTML = '';
            }
            return;
        }
        
        // 4. 선택된 컬럼 확인
        const selectedColumns = getSelectedRetiredColumns();
        if (selectedColumns.length === 0) {
            로거_인사?.warn('컬럼 미선택');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('최소 1개 이상의 항목을 선택하세요.');
            } else {
                alert('⚠️ 최소 1개 이상의 항목을 선택하세요.');
            }
            return;
        }
        
        // 5. 퇴사일 순 정렬
        retiredEmployees.sort((a, b) => {
            const dateA = a.employment?.retirementDate || '';
            const dateB = b.employment?.retirementDate || '';
            return dateA.localeCompare(dateB);
        });
        
        로거_인사?.debug('퇴사자 정렬 완료');
        
        // 6. 테이블 헤더 생성
        let headerHTML = '<tr style="background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);color:white;">';
        selectedColumns.forEach(colKey => {
            const col = RETIRED_COLUMNS[colKey];
            // ✅ XSS 방지
            const safeLabel = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.escapeHtml(col.label)
                : col.label;
            
            headerHTML += `<th style="padding:12px;border:1px solid #e8ebed;white-space:nowrap;text-align:center;">${safeLabel}</th>`;
        });
        headerHTML += '</tr>';
        
        // 7. 테이블 데이터 생성 (⭐ v4.0.0: async/await 지원)
        const rowsArray = [];
        for (let index = 0; index < retiredEmployees.length; index++) {
            const emp = retiredEmployees[index];
            try {
                const rowData = await buildRetiredRowData(emp, index);
                
                let rowHTML = '<tr>';
                selectedColumns.forEach(colKey => {
                    const value = rowData[colKey];
                    const style = getRetiredColumnStyle(colKey, rowData);
                    
                    // ✅ 모든 데이터 가운데 정렬 + 줄바꿈 방지
                    rowHTML += `<td style="padding:10px;border:1px solid #e8ebed;text-align:center;white-space:nowrap;${style}">${value}</td>`;
                });
                rowHTML += '</tr>';
                
                rowsArray.push(rowHTML);
                
            } catch (error) {
                로거_인사?.error('행 데이터 생성 오류', { 
                    employee: emp.uniqueCode, 
                    error: error.message 
                });
            }
        }
        const rows = rowsArray.join('');
        
        // 8. 결과 HTML 생성
        const resultHTML = `
            <div class="card">
                <div class="card-title">퇴사자 목록 (${startDate} ~ ${endDate}) - 총 ${retiredEmployees.length}명</div>
                <div style="overflow-x:auto;">
                    <table id="retiredListTable" style="width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;">
                        <thead>${headerHTML}</thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="alert alert-info no-print" style="margin-top:20px;">
                    <span>ℹ️</span>
                    <span><strong>표시 설명:</strong> 
                    • 퇴사일 = 마지막 근무일입니다. (예: 2024-12-31 퇴사 = 2024-12-31까지 근무)<br>
                    • 실제 퇴사는 퇴사일 다음날부터 발생합니다. (2024-12-31 퇴사 → 2025-01-01부터 퇴사)<br>
                    • 따라서 종료일과 같은 퇴사일은 제외됩니다. (기간 내 마지막까지 근무)<br>
                    • 퇴사시 호봉과 근속기간은 퇴사일 기준으로 계산됩니다.<br>
                    • 호봉이 "-"인 직원은 연봉제입니다.</span>
                </div>
                <div class="no-print" style="margin-top:20px;text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="printRetiredList('portrait')">🖨 인쇄 (A4 세로)</button>
                    <button class="btn btn-primary" onclick="printRetiredList('landscape')">🖨 인쇄 (A4 가로)</button>
                    <button class="btn btn-success" onclick="exportRetiredListToExcel()">📥 엑셀 다운로드</button>
                </div>
            </div>
        `;
        
        // 9. 결과 표시
        const resultContainer = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredListResult')
            : document.getElementById('retiredListResult');
        
        if (resultContainer) {
            resultContainer.innerHTML = resultHTML;
            resultContainer.scrollIntoView({ behavior: 'smooth' });
            
            로거_인사?.info('퇴사자 목록 생성 완료', { 
                startDate,
                endDate,
                employees: retiredEmployees.length,
                columns: selectedColumns.length 
            });
        } else {
            로거_인사?.warn('결과 컨테이너를 찾을 수 없음');
        }
        
    } catch (error) {
        로거_인사?.error('퇴사자 목록 생성 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '퇴사자 목록 생성 중 오류가 발생했습니다.');
        } else {
            alert('❌ 퇴사자 목록 생성 중 오류가 발생했습니다.');
            console.error('퇴사자 목록 생성 오류:', error);
        }
    }
}

/**
 * 행 데이터 생성
 * 
 * @param {Object} emp - 직원 객체
 * @param {number} index - 행 인덱스 (0부터 시작)
 * @returns {Object} 행 데이터 객체
 * 
 * @description
 * 직원 데이터를 테이블 행 데이터로 변환
 * - 퇴사일 기준 호봉 계산
 * - 근속기간 계산 (입사일 ~ 퇴사일)
 * - 직원유틸_인사 사용하여 중복 코드 제거
 * 
 * @example
 * const rowData = await buildRetiredRowData(employee, 0);
 */
async function buildRetiredRowData(emp, index) {
    try {
        // ✅ 직원유틸 사용
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name || '이름없음');
        
        const entryDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getEntryDate(emp)
            : (emp.employment?.entryDate || '-');
        
        const retirementDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getRetirementDate(emp)
            : (emp.employment?.retirementDate || '-');
        
        const employmentType = emp.employment?.type || '정규직';
        
        // 부서/직위/직급
        const dept = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getDepartment(emp)
            : (emp.currentPosition?.dept || emp.dept || '-');
        
        const position = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getPosition(emp)
            : (emp.currentPosition?.position || emp.position || '-');
        
        const grade = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getGrade(emp)
            : (emp.currentPosition?.grade || '-');
        
        const jobType = emp.currentPosition?.jobType || '-';
        
        // 호봉 정보
        const isRankBased = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.isRankBased(emp)
            : (emp.rank?.isRankBased === true && emp.rank?.firstUpgradeDate);
        
        let startRankDisplay = '-';
        let retiredRankDisplay = '-';
        
        if (isRankBased) {
            try {
                // ⭐ v6.0.0: 로컬 계산 사용 (퇴사자는 기준일이 각자 다르므로 배치 API 불가)
                const startRank = emp.rank?.startRank || 1;
                startRankDisplay = startRank + '호봉';
                
                let retiredRank;
                if (typeof RankCalculator !== 'undefined' && emp.rank?.firstUpgradeDate) {
                    retiredRank = RankCalculator.calculateCurrentRank(startRank, emp.rank.firstUpgradeDate, retirementDate);
                } else {
                    retiredRank = startRank;
                }
                retiredRankDisplay = retiredRank + '호봉';
                
            } catch (e) {
                로거_인사?.error('퇴사시 호봉 계산 오류', { 
                    employee: emp.uniqueCode, 
                    error: e.message 
                });
                const startRank = emp.rank?.startRank || 1;
                startRankDisplay = startRank + '호봉';
                retiredRankDisplay = startRank + '호봉';
            }
        }
        
        // 근속기간 (입사일 ~ 퇴사일)
        let tenure = '-';
        if (entryDate && entryDate !== '-' && retirementDate && retirementDate !== '-') {
            try {
                // ⭐ v6.0.0: 로컬 계산 사용 (API 호출 제거)
                let tenureObj;
                if (typeof TenureCalculator !== 'undefined') {
                    tenureObj = TenureCalculator.calculate(entryDate, retirementDate);
                    tenure = TenureCalculator.format(tenureObj);
                }
            } catch (e) {
                로거_인사?.error('근속기간 계산 오류', { 
                    employee: emp.uniqueCode, 
                    error: e.message 
                });
            }
        }
        
        // ✅ XSS 방지
        const safeName = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(name)
            : name;
        
        const safeDept = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(dept)
            : dept;
        
        const safePosition = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(position)
            : position;
        
        return {
            no: index + 1,
            uniqueCode: emp.uniqueCode,
            name: safeName,
            dept: safeDept,
            position: safePosition,
            grade: grade,
            jobType: jobType,
            employeeNumber: emp.employeeNumber || '-',
            phone: emp.contactInfo?.phone || '-',
            email: emp.contactInfo?.email || '-',
            entryDate: entryDate,
            retirementDate: retirementDate,
            tenure: tenure,
            startRank: startRankDisplay,
            retiredRank: retiredRankDisplay,
            employmentType: employmentType,
            isRankBased: isRankBased
        };
        
    } catch (error) {
        로거_인사?.error('행 데이터 생성 오류', { 
            employee: emp?.uniqueCode, 
            error: error.message 
        });
        
        // Fallback
        return {
            no: index + 1,
            uniqueCode: emp?.uniqueCode || '-',
            name: '오류',
            dept: '-',
            position: '-',
            grade: '-',
            jobType: '-',
            employeeNumber: '-',
            phone: '-',
            email: '-',
            entryDate: '-',
            retirementDate: '-',
            tenure: '-',
            startRank: '-',
            retiredRank: '-',
            employmentType: '-',
            isRankBased: false
        };
    }
}

/**
 * 컬럼별 스타일
 * 
 * @param {string} colKey - 컬럼 키
 * @param {Object} rowData - 행 데이터
 * @returns {string} CSS 스타일 문자열
 * 
 * @description
 * 각 컬럼에 맞는 추가 스타일을 반환
 * - 호봉제 직원: 빨간색 굵은 글씨
 * - 연봉제 직원: 회색
 * 
 * @example
 * const style = getRetiredColumnStyle('retiredRank', rowData);
 */
function getRetiredColumnStyle(colKey, rowData) {
    let style = '';
    
    try {
        switch(colKey) {
            case 'retiredRank':
                // 호봉제: 빨간색 굵게, 연봉제: 회색
                style = `font-weight:600;color:${rowData.isRankBased ? '#ef4444' : '#6b7280'};`;
                break;
            case 'email':
                style = 'font-size:11px;';
                break;
        }
        
    } catch (error) {
        로거_인사?.error('컬럼 스타일 생성 오류', error);
    }
    
    return style;
}

// ===== 인쇄 =====

/**
 * 퇴사자 목록 인쇄
 * 
 * @param {string} orientation - 페이지 방향 ('portrait' 또는 'landscape')
 * 
 * @description
 * 퇴사자 목록을 A4 용지에 인쇄
 * - 인쇄유틸_인사.print() 사용 ⭐ 핵심
 * - ID 기반 인쇄 영역 (retired-employees-print-area)
 * - 사이드바/메뉴 숨김
 * - 테이블만 깔끔하게 인쇄
 * - 제목 포함
 * - 테이블 가운데 정렬
 * 
 * @important
 * Before: window.print() → 사이드바, 메뉴 모두 출력됨 ❌
 * After: 인쇄유틸_인사.print() → 테이블만 출력 ✅
 * 
 * @example
 * printRetiredList('landscape'); // A4 가로 인쇄
 * printRetiredList('portrait');  // A4 세로 인쇄
 */
function printRetiredList(orientation = 'landscape') {
    try {
        로거_인사?.info('퇴사자 목록 인쇄 시작', { orientation });
        
        const table = document.getElementById('retiredListTable');
        
        if (!table) {
            alert('⚠️ 먼저 퇴사자 목록을 생성하세요.');
            return;
        }
        
        // 제목 추출
        const cardTitle = document.querySelector('#retiredListResult .card-title');
        const titleText = cardTitle ? cardTitle.textContent : '퇴사자 목록';
        
        // 테이블 복제 및 스타일 적용
        const tableClone = table.cloneNode(true);
        tableClone.querySelectorAll('th, td').forEach(cell => {
            cell.style.textAlign = 'center';
        });
        
        // ⭐ 헤더 행의 인라인 스타일 초기화 (color:white 제거)
        const headerRow = tableClone.querySelector('thead tr');
        if (headerRow) {
            headerRow.style.background = '';
            headerRow.style.color = '';
        }
        
        const pageStyle = orientation === 'landscape' 
            ? '@page { size: A4 landscape; margin: 10mm; }' 
            : '@page { size: A4 portrait; margin: 10mm; }';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>퇴사자 목록 인쇄</title>
                <style>
                    ${pageStyle}
                    body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 20px; }
                    h2 { text-align: center; margin-bottom: 20px; font-size: 18px; }
                    table { border-collapse: collapse; width: 100%; font-size: ${orientation === 'landscape' ? '10px' : '12px'}; }
                    th, td { border: 1px solid #e8ebed; padding: ${orientation === 'landscape' ? '4px' : '6px'}; text-align: center; }
                    th { background: #f8f9fa !important; color: #333 !important; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    .no-print { position: fixed; top: 20px; right: 20px; background: #2196F3; color: white; padding: 12px 24px; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; z-index: 9999; }
                    .no-print:hover { background: #1976D2; }
                    @media print { body { padding: 0; } .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()">🖨️ 인쇄하기 (Ctrl+P)</button>
                <h2>${titleText}</h2>
                ${tableClone.outerHTML}
            </body>
            </html>
        `;
        
        // Electron 환경에서 시스템 브라우저로 열기
        if (window.electronAPI && window.electronAPI.openInBrowser) {
            window.electronAPI.openInBrowser(htmlContent, 'retired_list_print.html');
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                alert('팝업이 차단되었습니다.');
            }
        }
        
    } catch (error) {
        로거_인사?.error('퇴사자 목록 인쇄 실패', error);
        alert('❌ 인쇄 중 오류가 발생했습니다.');
    }
}

// ===== 엑셀 다운로드 =====

/**
 * 퇴사자 목록 엑셀 다운로드
 * 
 * @description
 * 현재 표시된 퇴사자 목록을 엑셀 파일로 다운로드
 * - 파일명: 퇴사자목록_YYYY-MM-DD_YYYY-MM-DD.xlsx
 * 
 * @requires XLSX - SheetJS 라이브러리
 * 
 * @example
 * exportRetiredListToExcel(); // 엑셀 다운로드
 */
function exportRetiredListToExcel() {
    try {
        로거_인사?.info('엑셀 다운로드 시작');
        
        // 테이블 확인
        const table = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredListTable')
            : document.getElementById('retiredListTable');
        
        if (!table) {
            로거_인사?.warn('테이블을 찾을 수 없음');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('먼저 퇴사자 목록을 생성하세요.');
            } else {
                alert('⚠️ 먼저 퇴사자 목록을 생성하세요.');
            }
            return;
        }
        
        // XLSX 확인
        if (typeof XLSX === 'undefined') {
            로거_인사?.error('XLSX 라이브러리 없음');
            throw new Error('엑셀 라이브러리를 불러올 수 없습니다.');
        }
        
        // 날짜 가져오기
        const startDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredStartDate')
            : document.getElementById('retiredStartDate');
        
        const endDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredEndDate')
            : document.getElementById('retiredEndDate');
        
        const startDate = startDateField?.value || '시작일';
        const endDate = endDateField?.value || '종료일';
        
        // 엑셀 생성
        const wb = XLSX.utils.table_to_book(table);
        const filename = `퇴사자목록_${startDate}_${endDate}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        로거_인사?.info('엑셀 다운로드 완료', { filename });
        
        const message = `✅ 퇴사자 목록이 엑셀로 다운로드되었습니다.\n\n파일명: ${filename}`;
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(message);
        } else {
            alert(message);
        }
        
    } catch (error) {
        로거_인사?.error('엑셀 다운로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '엑셀 다운로드 중 오류가 발생했습니다.');
        } else {
            alert('❌ 엑셀 다운로드 중 오류가 발생했습니다.');
            console.error('엑셀 다운로드 오류:', error);
        }
    }
}

// ===== 초기화 =====

/**
 * 날짜 자동 설정
 * 
 * @description
 * 페이지 로드 시 날짜 필드를 자동으로 설정
 * - 시작일: 현재 년도 1월 1일 (예: 2024-01-01)
 * - 종료일: 오늘 날짜 (예: 2024-11-05)
 * 
 * @example
 * setDefaultRetiredDates(); // 날짜 자동 설정
 */
function setDefaultRetiredDates() {
    try {
        로거_인사?.debug('날짜 자동 설정 시작');
        
        const startDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredStartDate')
            : document.getElementById('retiredStartDate');
        
        const endDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retiredEndDate')
            : document.getElementById('retiredEndDate');
        
        if (!startDateField || !endDateField) {
            로거_인사?.warn('날짜 필드를 찾을 수 없음');
            return;
        }
        
        // 오늘 날짜
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        // 시작일: 현재 년도 1월 1일
        const startDate = `${year}-01-01`;
        
        // 종료일: 오늘
        const endDate = `${year}-${month}-${day}`;
        
        // 필드에 설정
        startDateField.value = startDate;
        endDateField.value = endDate;
        
        로거_인사?.info('날짜 자동 설정 완료', { startDate, endDate });
        
    } catch (error) {
        로거_인사?.error('날짜 자동 설정 오류', error);
    }
}

/**
 * 페이지 로드 이벤트
 * 
 * @description
 * 페이지 로드 시 초기화 작업 수행
 * - 컬럼 선택기 추가
 * - 날짜 자동 설정 (100ms 후)
 */
window.addEventListener('DOMContentLoaded', function() {
    try {
        로거_인사?.info('퇴사자목록 모듈 초기화 시작');
        
        // 컬럼 선택기 추가
        const retiredModule = document.querySelector('#module-retired-list .card');
        if (retiredModule) {
            const existingContent = retiredModule.innerHTML;
            const newContent = existingContent.replace(
                '<button class="btn btn-primary" onclick="generateRetiredList()">',
                showRetiredColumnSelector() + '<button class="btn btn-primary" onclick="generateRetiredList()">'
            );
            retiredModule.innerHTML = newContent;
            
            로거_인사?.debug('컬럼 선택기 추가 완료');
        }
        
        // 날짜 자동 설정 (100ms 후)
        setTimeout(() => {
            setDefaultRetiredDates();
        }, 100);
        
        로거_인사?.info('퇴사자목록 모듈 초기화 완료');
        
    } catch (error) {
        로거_인사?.error('퇴사자목록 모듈 초기화 실패', error);
        console.error('퇴사자목록 초기화 오류:', error);
    }
});
