/**
 * 급여현황_인사.js - 급여 현황표
 * 
 * 기준 연월의 직원별 급여 정보 표시
 * - 기준 연월 선택
 * - 직원별 기본급, 직책수당, 명절휴가비, 통상임금, 시급 표시
 * - 부서/직급별 필터링
 * - 육아휴직자 제외 옵션
 * - 엑셀 다운로드
 * - 인쇄 (A4 가로)
 * 
 * @version 1.9.0
 * @since 2025-12-02
 * @location js/labor/급여현황_인사.js
 * 
 * [변경 이력]
 * v1.9.0 - 시급 배율 적용 절사 시점 설정 반영 (2026-01-07)
 *   - 급여설정의 hourlyWageRounding.applyTiming 설정 반영
 *   - 'after' (기본값): 원시급 × 배율 → 절사
 *   - 'before': 원시급 → 절사 → × 배율
 *   - _getHourlyWage1xValue, _getHourlyWage15xValue: getRatedHourlyWage 사용
 * v1.8.0 - 육아휴직자 제외 옵션 추가 (2025-12-12)
 *   - "육아휴직자 제외" 체크박스 추가 (기본 체크)
 *   - 해당 월 전체가 육아휴직인 직원만 제외
 *   - 일부 근무일이 있는 직원은 체크 여부와 관계없이 표시
 * v1.7.0 - 명절휴가비 산입 방식에 따른 헤더 동적 표시 (2025-12-11)
 *   - holidayBonusMethod 설정에 따라 헤더 변경
 *   - 연간 고정: "명절휴가비(월환산)"
 *   - 월별 연동: "명절휴가비(X%)" (설정된 비율 표시)
 *   - 테이블/엑셀/인쇄 모두 동일하게 적용
 * v1.6.0 - 소수점 표시 옵션 추가 (2025-12-11)
 *   - 급여설정이 "소수점 유지"일 때 체크박스 옵션 추가
 *   - 체크 해제: 시급을 소수점 2자리까지 표시
 *   - 체크: 화면/인쇄는 정수로 표시 (안내 문구 포함)
 *   - 엑셀: 항상 실제 소수점 값 저장 (계산 정확도 유지)
 *   - _getHourlyWage1xValue(), _getHourlyWage15xValue() 원본값 함수 추가
 *   - _updateDecimalHint(), _onDecimalOptionChange() 체크박스 처리 함수 추가
 * v1.5.0 - 시급(1.5배) 설정 반영 버그 수정 (2025-12-11)
 *   - 시급(1.5배) 계산 시 급여설정의 절사 방식(method) 반영
 *   - 기존: 설정과 무관하게 항상 반올림 처리
 *   - 수정: 설정된 방식(버림/반올림/올림) 및 단위(1원/10원) 적용
 *   - _getHourlyWage1xDisplay(), _getHourlyWage15xDisplay() 헬퍼 함수 추가
 *   - 화면/엑셀/인쇄 모두 동일하게 설정 반영
 * v1.4.0 - 시급 절사 방식 설정 반영 (2025-12-08)
 *   - SalaryCalculator.getHourlyWage()에서 설정에 따라 절사된 시급 사용
 *   - 소수점 유지 / 정수 처리(1원·10원 단위, 버림·반올림·올림) 설정 반영
 *   - 시급(1배): 설정에 따라 계산된 값을 정수로 표시
 *   - 시급(1.5배): 시급(1배) × 1.5 후 반올림 표시
 * v1.3.0 - 시급 표시 정수화 (2025-12-05)
 *   - 시급 1배: Math.floor() 적용하여 정수로 표시
 *   - 내부 계산용 값은 소수점 유지 (시간외수당 정확도)
 *   - 화면/엑셀/인쇄 모두 동일하게 정수 표시
 * v1.2.0 - 정렬 기준 개선 (2025-12-02)
 *   - 조직도와 동일한 정렬: 부서 → 직위순서 → 급여유형 → 호봉 → 입사일
 *   - 조직도설정(hr_org_chart_settings)의 직위 order 값 사용
 * v1.1.0 - 시급 1.5배 컬럼 추가 (2025-12-02)
 *   - 시급(1배), 시급(1.5배) 두 컬럼 표시
 *   - 연장/야간/휴일 근무 수당 계산 편의
 * v1.0.1 - db 호환성 수정 (2025-12-02)
 *   - assignment.department → assignment.dept
 *   - employee.personal.name → employee.personalInfo.name
 * v1.0.0 - 최초 생성 (2025-12-02)
 * 
 * [의존성]
 * - 급여계산기_인사.js (SalaryCalculator)
 * - 급여설정_인사.js (SalarySettingsManager)
 * - 데이터베이스_인사.js (db)
 * - 직원유틸_인사.js (직원유틸_인사)
 * - DOM유틸_인사.js (DOM유틸_인사)
 * - 인쇄유틸_인사.js (인쇄유틸_인사)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 * - XLSX (SheetJS) - 엑셀 다운로드
 */

// ===== 전역 변수 =====

/**
 * 현재 생성된 급여현황표 데이터
 * @type {Array|null}
 */
let _salaryStatusData = null;

/**
 * 현재 분석 설정
 * @type {Object|null}
 */
let _salaryStatusSettings = null;

// ===== 유틸리티 함수 =====

/**
 * 해당 월 전체가 육아휴직 기간인지 확인
 * @param {Object} emp - 직원 객체
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} monthEnd - 월 종료일 (YYYY-MM-DD)
 * @returns {boolean} 전체 휴직 여부
 */
function _isFullMonthMaternityLeave(emp, monthStart, monthEnd) {
    try {
        const history = emp.maternityLeave?.history;
        if (!history || history.length === 0) return false;
        
        // 어떤 휴직 이력이 해당 월 전체를 포함하는지 확인
        for (const leave of history) {
            const leaveStart = leave.startDate;
            // 복직일이 있으면 복직일, 없으면 예정종료일 사용
            const leaveEnd = leave.returnedAt || leave.plannedEndDate;
            
            if (!leaveStart || !leaveEnd) continue;
            
            // 휴직 시작일 <= 월 시작일 AND 휴직 종료일 >= 월 종료일
            // → 해당 월 전체가 휴직 기간에 포함됨
            if (leaveStart <= monthStart && leaveEnd >= monthEnd) {
                return true;
            }
        }
        
        return false;
    } catch (e) {
        로거_인사?.error('육아휴직 확인 실패', e);
        return false;
    }
}

// ===== 모듈 초기화 =====

/**
 * 급여 현황표 모듈 로드
 */
function loadSalaryStatusModule() {
    try {
        로거_인사?.debug('급여 현황표 모듈 로드 시작');
        
        const container = document.getElementById('module-salary-status');
        if (!container) {
            로거_인사?.error('급여 현황표 컨테이너를 찾을 수 없음');
            return;
        }
        
        container.innerHTML = _generateSalaryStatusHTML();
        
        // 기본값 설정 (현재 연월)
        _setDefaultDateValues();
        
        로거_인사?.info('급여 현황표 모듈 로드 완료');
        
    } catch (error) {
        로거_인사?.error('급여 현황표 모듈 로드 실패', error);
        에러처리_인사?.handle(error, '급여 현황표 모듈 로드 중 오류가 발생했습니다.');
    }
}

/**
 * 기본 날짜값 설정
 * @private
 */
function _setDefaultDateValues() {
    const now = new Date();
    const yearSelect = document.getElementById('salaryStatusYear');
    const monthSelect = document.getElementById('salaryStatusMonth');
    
    if (yearSelect) {
        yearSelect.value = now.getFullYear();
    }
    if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
    }
}

/**
 * 급여 현황표 메인 HTML 생성
 * @private
 * @returns {string} HTML
 */
function _generateSalaryStatusHTML() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
        years.push(y);
    }
    
    return `
        <div class="card">
            <div class="card-title">📊 급여 현황표</div>
            
            <div class="alert alert-info">
                <span>💡</span>
                <span>기준 연월의 재직자별 급여 정보를 조회합니다. 급여 설정이 완료되어야 정확한 정보가 표시됩니다.</span>
            </div>
            
            <!-- 조회 조건 -->
            <div class="salary-status-filters">
                <div class="filter-row">
                    <div class="filter-group">
                        <label>기준 연월</label>
                        <div class="date-selectors">
                            <select id="salaryStatusYear">
                                ${years.map(y => `<option value="${y}">${y}년</option>`).join('')}
                            </select>
                            <select id="salaryStatusMonth">
                                ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                                    `<option value="${m}">${m}월</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label>부서 필터</label>
                        <select id="salaryStatusDept">
                            <option value="">전체 부서</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>급여 방식</label>
                        <select id="salaryStatusPayType">
                            <option value="">전체</option>
                            <option value="rank">호봉제</option>
                            <option value="salary">연봉제</option>
                        </select>
                    </div>
                </div>
                
                <!-- 소수점 유지 설정일 때만 표시되는 옵션 -->
                <div class="filter-row" id="salaryStatusDecimalOptions" style="display:none;">
                    <div class="filter-group decimal-option-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="salaryStatusShowInteger" onchange="_onDecimalOptionChange()">
                            <span>시급을 정수로 표시</span>
                        </label>
                        <div class="decimal-option-hint" id="salaryStatusDecimalHint">
                            💡 급여설정이 "소수점 유지"로 되어 있어 시급이 소수점 2자리까지 표시됩니다.
                        </div>
                    </div>
                </div>
                
                <div class="filter-actions">
                    <button class="btn btn-primary" onclick="generateSalaryStatus()">
                        📊 현황표 생성
                    </button>
                    
                    <!-- 육아휴직자 제외 옵션 -->
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:8px 12px;background:#fef3c7;border-radius:6px;border:1px solid #fcd34d;margin-left:12px;">
                        <input type="checkbox" id="salaryStatusExcludeMaternity" checked>
                        <span>🤱 육아휴직자 제외</span>
                    </label>
                </div>
            </div>
        </div>
        
        <!-- 결과 영역 -->
        <div id="salaryStatusResult"></div>
        
        <style>
            .salary-status-filters {
                background: #f8f9fe;
                padding: 20px;
                border-radius: 8px;
                margin-top: 16px;
            }
            .filter-row {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }
            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .filter-group label {
                font-size: 13px;
                font-weight: 600;
                color: #374151;
            }
            .filter-group select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                min-width: 120px;
            }
            .date-selectors {
                display: flex;
                gap: 8px;
            }
            .filter-actions {
                display: flex;
                justify-content: flex-end;
            }
            
            /* 소수점 옵션 스타일 */
            .decimal-option-group {
                flex: 1;
                background: #fef3c7;
                padding: 12px 16px;
                border-radius: 6px;
                border: 1px solid #f59e0b;
            }
            .decimal-option-group .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-weight: 500;
            }
            .decimal-option-group .checkbox-label input[type="checkbox"] {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .decimal-option-hint {
                margin-top: 8px;
                font-size: 12px;
                color: #92400e;
                line-height: 1.5;
            }
            .decimal-notice {
                background: #fef2f2;
                border: 1px solid #fca5a5;
                color: #991b1b;
                padding: 10px 14px;
                border-radius: 6px;
                font-size: 13px;
                margin-bottom: 12px;
            }
            
            /* 결과 테이블 스타일 */
            .salary-status-table-container {
                margin-top: 20px;
                overflow-x: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
            .salary-status-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                white-space: nowrap;
            }
            .salary-status-table th,
            .salary-status-table td {
                padding: 10px 12px;
                border: 1px solid #e5e7eb;
                text-align: center;
            }
            .salary-status-table th {
                background: #f3f4f6;
                font-weight: 600;
                color: #374151;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .salary-status-table td.name-col {
                text-align: left;
                font-weight: 500;
            }
            .salary-status-table td.number-col {
                text-align: right;
                font-family: 'Consolas', monospace;
            }
            .salary-status-table tr:hover {
                background: #f9fafb;
            }
            .salary-status-table .rank-based {
                color: #4f46e5;
            }
            .salary-status-table .salary-based {
                color: #059669;
            }
            .salary-status-table tfoot td {
                background: #f8f9fe;
                font-weight: 600;
            }
            
            /* 요약 카드 */
            .salary-summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }
            .summary-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }
            .summary-card .value {
                font-size: 24px;
                font-weight: 700;
                color: #4f46e5;
            }
            .summary-card .label {
                font-size: 13px;
                color: #6b7280;
                margin-top: 4px;
            }
            
            /* 액션 버튼 */
            .salary-status-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }
        </style>
    `;
}

// ===== 현황표 생성 =====

/**
 * 급여 현황표 생성
 */
function generateSalaryStatus() {
    try {
        로거_인사?.info('급여 현황표 생성 시작');
        
        // 조회 조건 수집
        const year = parseInt(document.getElementById('salaryStatusYear')?.value, 10);
        const month = parseInt(document.getElementById('salaryStatusMonth')?.value, 10);
        const deptFilter = document.getElementById('salaryStatusDept')?.value || '';
        const payTypeFilter = document.getElementById('salaryStatusPayType')?.value || '';
        const excludeMaternity = document.getElementById('salaryStatusExcludeMaternity')?.checked || false;
        
        if (!year || !month) {
            에러처리_인사?.warn('기준 연월을 선택하세요.');
            return;
        }
        
        // 기준일 설정 (해당 월의 마지막 날)
        const lastDay = new Date(year, month, 0).getDate();
        const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = targetDate;
        
        // 시급 절사 설정 확인
        const ordinarySettings = SalarySettingsManager?.getOrdinarySettingsByYear?.(year) || {};
        const hourlyWageRounding = ordinarySettings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor' };
        const isDecimalMode = hourlyWageRounding.type === 'decimal';
        
        // 명절휴가비 산입 방식 확인
        const holidayBonusMethod = ordinarySettings.holidayBonusMethod || 'annual';
        const holidayBonusMonthlyRate = SalaryCalculator?.getHolidayBonusMonthlyRate?.(year) || '10.0';
        
        // 소수점 유지 설정일 때 체크박스 표시
        const decimalOptionsEl = document.getElementById('salaryStatusDecimalOptions');
        if (decimalOptionsEl) {
            decimalOptionsEl.style.display = isDecimalMode ? 'flex' : 'none';
        }
        
        // 설정 저장
        _salaryStatusSettings = {
            year, month, targetDate, deptFilter, payTypeFilter, excludeMaternity,
            isDecimalMode, hourlyWageRounding,
            holidayBonusMethod, holidayBonusMonthlyRate
        };
        
        // 전체 재직자 급여 정보 조회
        let data = SalaryCalculator.getAllEmployeesSalaryInfo(targetDate);
        
        if (!data || data.length === 0) {
            _renderNoData();
            return;
        }
        
        // ⭐ [v1.9.0] rawHourlyWage를 hourlyWage로 사용 (배율 적용 시점 설정 반영)
        data = data.map(d => ({
            ...d,
            hourlyWage: d.rawHourlyWage || d.hourlyWage
        }));
        
        // 육아휴직자 제외 필터
        if (excludeMaternity) {
            data = data.filter(d => {
                const emp = d.employee;
                if (!emp) return true;
                
                // 해당 월 전체가 육아휴직인지 확인
                if (_isFullMonthMaternityLeave(emp, monthStart, monthEnd)) {
                    로거_인사?.debug(`육아휴직 제외: ${emp.personalInfo?.name}`);
                    return false;
                }
                return true;
            });
        }
        
        // 부서 필터 적용
        if (deptFilter) {
            data = data.filter(d => d.assignment?.dept === deptFilter);
        }
        
        // 급여방식 필터 적용
        if (payTypeFilter) {
            if (payTypeFilter === 'rank') {
                data = data.filter(d => d.isRankBased === true);
            } else if (payTypeFilter === 'salary') {
                data = data.filter(d => d.isRankBased === false);
            }
        }
        
        // 조직도 설정에서 직위 순서 가져오기
        let positionOrderMap = new Map();
        try {
            const orgChartSettings = localStorage.getItem('hr_org_chart_settings');
            if (orgChartSettings) {
                const parsed = JSON.parse(orgChartSettings);
                if (parsed.positionSettings && Array.isArray(parsed.positionSettings)) {
                    parsed.positionSettings.forEach(p => {
                        positionOrderMap.set(p.name, p.order || 999);
                    });
                }
            }
        } catch (e) {
            로거_인사?.warn('조직도 설정 로드 실패', e);
        }
        
        // 정렬 (부서 → 직위순서 → 급여유형 → 호봉 → 입사일)
        data.sort((a, b) => {
            // 1차: 부서 (가나다순)
            const deptA = a.assignment?.dept || '';
            const deptB = b.assignment?.dept || '';
            if (deptA !== deptB) return deptA.localeCompare(deptB, 'ko');
            
            // 2차: 직위 순서 (조직도설정 order)
            const posA = a.position || '';
            const posB = b.position || '';
            const orderA = positionOrderMap.get(posA) || 999;
            const orderB = positionOrderMap.get(posB) || 999;
            if (orderA !== orderB) return orderA - orderB;
            
            // 3차: 급여 유형 (호봉제 → 연봉제)
            if (a.isRankBased !== b.isRankBased) {
                return a.isRankBased ? -1 : 1;
            }
            
            // 4차: 호봉 (높은 순)
            if (a.isRankBased && b.isRankBased && a.rank && b.rank) {
                if (a.rank !== b.rank) return b.rank - a.rank;
            }
            
            // 5차: 입사일 (빠른 순)
            const entryA = a.entryDate || '';
            const entryB = b.entryDate || '';
            if (entryA && entryB && entryA !== entryB) {
                return new Date(entryA) - new Date(entryB);
            }
            
            return 0;
        });
        
        // 데이터 저장
        _salaryStatusData = data;
        
        // 부서 필터 옵션 업데이트
        _updateDeptFilterOptions(data);
        
        // 결과 렌더링
        _renderSalaryStatusResult(data);
        
        로거_인사?.info('급여 현황표 생성 완료', { count: data.length });
        
    } catch (error) {
        로거_인사?.error('급여 현황표 생성 실패', error);
        에러처리_인사?.handle(error, '급여 현황표 생성 중 오류가 발생했습니다.');
    }
}

/**
 * 데이터 없음 렌더링
 * @private
 */
function _renderNoData() {
    const container = document.getElementById('salaryStatusResult');
    if (!container) return;
    
    container.innerHTML = `
        <div class="card">
            <div class="empty-state" style="padding:40px;text-align:center;color:#9ca3af;">
                <p>해당 기간에 재직 중인 직원이 없거나, 급여 설정이 완료되지 않았습니다.</p>
                <p style="margin-top:8px;font-size:13px;">노무관리 → 급여 설정에서 직급, 급여표, 직책수당, 명절휴가비를 설정해주세요.</p>
            </div>
        </div>
    `;
}

/**
 * 부서 필터 옵션 업데이트
 * @private
 */
function _updateDeptFilterOptions(data) {
    const select = document.getElementById('salaryStatusDept');
    if (!select) return;
    
    const depts = new Set();
    data.forEach(d => {
        if (d.assignment?.dept) {
            depts.add(d.assignment.dept);
        }
    });
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">전체 부서</option>';
    
    Array.from(depts).sort((a, b) => a.localeCompare(b, 'ko')).forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        if (dept === currentValue) option.selected = true;
        select.appendChild(option);
    });
}

/**
 * 급여 현황표 결과 렌더링
 * @private
 * @param {Array} data - 급여 정보 배열
 */
function _renderSalaryStatusResult(data) {
    const container = document.getElementById('salaryStatusResult');
    if (!container) return;
    
    const settings = _salaryStatusSettings;
    
    // 집계 계산
    const totalCount = data.length;
    const rankBasedCount = data.filter(d => d.isRankBased).length;
    const salaryBasedCount = data.filter(d => !d.isRankBased).length;
    const totalBaseSalary = data.reduce((sum, d) => sum + (d.baseSalary || 0), 0);
    const totalOrdinaryWage = data.reduce((sum, d) => sum + (d.ordinaryWage || 0), 0);
    
    // 평균 시급 계산 (설정 반영된 값 기준)
    const avgHourlyWage1x = totalCount > 0 
        ? data.reduce((sum, d) => sum + _getHourlyWage1xValue(d.hourlyWage, d.year), 0) / totalCount 
        : 0;
    const avgHourlyWage15x = totalCount > 0 
        ? data.reduce((sum, d) => sum + _getHourlyWage15xValue(d.hourlyWage, d.year), 0) / totalCount 
        : 0;
    
    // 평균 시급 표시용 포맷
    const showAsInteger = document.getElementById('salaryStatusShowInteger')?.checked || false;
    const avgHourlyWageDisplay = settings.isDecimalMode && !showAsInteger 
        ? _formatCurrency(avgHourlyWage1x, 2)
        : _formatCurrency(Math.round(avgHourlyWage1x));
    const avgHourlyWage15xDisplay = settings.isDecimalMode && !showAsInteger 
        ? _formatCurrency(avgHourlyWage15x, 2)
        : _formatCurrency(Math.round(avgHourlyWage15x));
    
    container.innerHTML = `
        <div class="card">
            <div class="card-title">
                📊 ${settings.year}년 ${settings.month}월 급여 현황표
                <span style="font-size:14px;font-weight:400;color:#6b7280;margin-left:8px;">
                    (기준일: ${settings.targetDate})
                </span>
            </div>
            
            <!-- 요약 카드 -->
            <div class="salary-summary-cards">
                <div class="summary-card">
                    <div class="value">${totalCount}</div>
                    <div class="label">총 인원</div>
                </div>
                <div class="summary-card">
                    <div class="value">${rankBasedCount}</div>
                    <div class="label">호봉제</div>
                </div>
                <div class="summary-card">
                    <div class="value">${salaryBasedCount}</div>
                    <div class="label">연봉제</div>
                </div>
                <div class="summary-card">
                    <div class="value">${avgHourlyWageDisplay}</div>
                    <div class="label">평균 시급</div>
                </div>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="salary-status-actions">
                <button class="btn btn-secondary btn-sm" onclick="downloadSalaryStatusExcel()">
                    📥 엑셀 다운로드
                </button>
                <button class="btn btn-secondary btn-sm" onclick="printSalaryStatus()">
                    🖨️ 인쇄
                </button>
            </div>
            
            ${settings.isDecimalMode && showAsInteger ? `
            <div class="decimal-notice">
                ⚠️ 시급 컬럼은 정수로 표시되어 있으나, <strong>실제 값은 소수점이 포함</strong>되어 있습니다. 
                정확한 계산이 필요한 경우 엑셀을 다운로드하세요.
            </div>
            ` : ''}
            
            <!-- 테이블 -->
            <div class="salary-status-table-container">
                <table class="salary-status-table" id="salaryStatusTable">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>부서</th>
                            <th>이름</th>
                            <th>직급</th>
                            <th>호봉</th>
                            <th>직위</th>
                            <th>급여방식</th>
                            <th>기본급</th>
                            <th>직책수당</th>
                            <th>명절휴가비<br>${settings.holidayBonusMethod === 'monthly' ? `(${settings.holidayBonusMonthlyRate}%)` : '(월환산)'}</th>
                            <th>통상임금</th>
                            <th>주근로<br>시간</th>
                            <th>월소정<br>근로시간</th>
                            <th>시급<br>(1배)</th>
                            <th>시급<br>(1.5배)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((d, index) => _renderSalaryStatusRow(d, index + 1)).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7">합계 / 평균</td>
                            <td class="number-col">${_formatCurrency(totalBaseSalary)}</td>
                            <td class="number-col">${_formatCurrency(data.reduce((sum, d) => sum + (d.positionAllowance || 0), 0))}</td>
                            <td class="number-col">${_formatCurrency(data.reduce((sum, d) => sum + (d.monthlyHolidayBonus || 0), 0))}</td>
                            <td class="number-col">${_formatCurrency(totalOrdinaryWage)}</td>
                            <td>-</td>
                            <td>-</td>
                            <td class="number-col">${avgHourlyWageDisplay}</td>
                            <td class="number-col">${avgHourlyWage15xDisplay}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

/**
 * 급여 현황표 행 렌더링
 * @private
 * @param {Object} data - 급여 정보
 * @param {number} rowNum - 행 번호
 * @returns {string} HTML
 */
function _renderSalaryStatusRow(data, rowNum) {
    const emp = data.employee;
    const assign = data.assignment;
    
    const name = emp?.personalInfo?.name || '-';
    const dept = assign?.dept || '-';
    const grade = data.grade || '-';
    const rank = data.isRankBased && data.rank ? data.rank : '-';
    const position = data.position || '-';
    const payType = data.isRankBased ? '호봉제' : '연봉제';
    const payTypeClass = data.isRankBased ? 'rank-based' : 'salary-based';
    
    return `
        <tr>
            <td>${rowNum}</td>
            <td>${_escapeHtml(dept)}</td>
            <td class="name-col">${_escapeHtml(name)}</td>
            <td>${_escapeHtml(grade)}</td>
            <td>${rank}</td>
            <td>${_escapeHtml(position)}</td>
            <td class="${payTypeClass}">${payType}</td>
            <td class="number-col">${_formatCurrency(data.baseSalary)}</td>
            <td class="number-col">${_formatCurrency(data.positionAllowance)}</td>
            <td class="number-col">${_formatCurrency(data.monthlyHolidayBonus)}</td>
            <td class="number-col">${_formatCurrency(data.ordinaryWage)}</td>
            <td class="number-col">${data.weeklyWorkingHours || 40}</td>
            <td class="number-col">${data.monthlyWorkingHours || 209}</td>
            <td class="number-col">${_getHourlyWage1xDisplay(data.hourlyWage, data.year)}</td>
            <td class="number-col">${_getHourlyWage15xDisplay(data.hourlyWage, data.year)}</td>
        </tr>
    `;
}

// ===== 엑셀 다운로드 =====

/**
 * 급여 현황표 엑셀 다운로드
 */
function downloadSalaryStatusExcel() {
    try {
        if (!_salaryStatusData || _salaryStatusData.length === 0) {
            에러처리_인사?.warn('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const settings = _salaryStatusSettings;
        
        // 데이터 구성
        const rows = [];
        
        // 헤더 (명절휴가비 컬럼명은 설정에 따라 다르게 표시)
        const holidayBonusHeader = settings.holidayBonusMethod === 'monthly' 
            ? `명절휴가비(${settings.holidayBonusMonthlyRate}%)`
            : '명절휴가비(월환산)';
        
        rows.push([
            'No', '부서', '이름', '직급', '호봉', '직위', '급여방식',
            '기본급', '직책수당', holidayBonusHeader, '통상임금',
            '주근로시간', '월소정근로시간', '시급(1배)', '시급(1.5배)'
        ]);
        
        // 데이터 행
        _salaryStatusData.forEach((d, index) => {
            rows.push([
                index + 1,
                d.assignment?.dept || '',
                d.employee?.personalInfo?.name || '',
                d.grade || '',
                d.isRankBased && d.rank ? d.rank : '',
                d.position || '',
                d.isRankBased ? '호봉제' : '연봉제',
                d.baseSalary || 0,
                d.positionAllowance || 0,
                d.monthlyHolidayBonus || 0,
                d.ordinaryWage || 0,
                d.weeklyWorkingHours || 40,
                d.monthlyWorkingHours || 209,
                _getHourlyWage1xValue(d.hourlyWage, d.year),
                _getHourlyWage15xValue(d.hourlyWage, d.year)
            ]);
        });
        
        // 워크북 생성
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '급여현황표');
        
        // 열 너비 설정
        ws['!cols'] = [
            { wch: 5 },   // No
            { wch: 15 },  // 부서
            { wch: 10 },  // 이름
            { wch: 12 },  // 직급
            { wch: 6 },   // 호봉
            { wch: 10 },  // 직위
            { wch: 8 },   // 급여방식
            { wch: 12 },  // 기본급
            { wch: 10 },  // 직책수당
            { wch: 12 },  // 명절휴가비
            { wch: 12 },  // 통상임금
            { wch: 8 },   // 주근로시간
            { wch: 10 },  // 월소정근로시간
            { wch: 10 },  // 시급(1배)
            { wch: 10 }   // 시급(1.5배)
        ];
        
        // 다운로드
        const filename = `급여현황표_${settings.year}년${settings.month}월.xlsx`;
        XLSX.writeFile(wb, filename);
        
        에러처리_인사?.success('엑셀 파일이 다운로드되었습니다.');
        로거_인사?.info('급여 현황표 엑셀 다운로드', { filename, count: _salaryStatusData.length });
        
    } catch (error) {
        로거_인사?.error('급여 현황표 엑셀 다운로드 실패', error);
        에러처리_인사?.warn('엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

// ===== 인쇄 =====

/**
 * 급여 현황표 인쇄
 */
function printSalaryStatus() {
    try {
        if (!_salaryStatusData || _salaryStatusData.length === 0) {
            에러처리_인사?.warn('인쇄할 데이터가 없습니다.');
            return;
        }
        
        const settings = _salaryStatusSettings;
        
        // 인쇄 스타일
        const printStyles = `
            <style>
                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
                body {
                    font-family: 'Malgun Gothic', sans-serif;
                    font-size: 10px;
                }
                h1 {
                    font-size: 16px;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .info {
                    text-align: right;
                    font-size: 10px;
                    color: #666;
                    margin-bottom: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }
                th, td {
                    border: 1px solid #333;
                    padding: 4px 6px;
                    text-align: center;
                }
                th {
                    background: #f0f0f0;
                    font-weight: bold;
                }
                td.name-col {
                    text-align: left;
                }
                td.number-col {
                    text-align: right;
                    font-family: monospace;
                }
                .rank-based { color: #4f46e5; }
                .salary-based { color: #059669; }
                tfoot td {
                    background: #f8f8f8;
                    font-weight: bold;
                }
            </style>
        `;
        
        // 집계 계산
        const totalCount = _salaryStatusData.length;
        const totalBaseSalary = _salaryStatusData.reduce((sum, d) => sum + (d.baseSalary || 0), 0);
        const totalOrdinaryWage = _salaryStatusData.reduce((sum, d) => sum + (d.ordinaryWage || 0), 0);
        
        // 체크박스 상태 확인
        const showAsInteger = document.getElementById('salaryStatusShowInteger')?.checked || false;
        
        // 평균 시급 계산 (설정 반영된 값 기준)
        const avgHourlyWage1x = totalCount > 0 
            ? _salaryStatusData.reduce((sum, d) => sum + _getHourlyWage1xValue(d.hourlyWage, d.year), 0) / totalCount 
            : 0;
        const avgHourlyWage15x = totalCount > 0 
            ? _salaryStatusData.reduce((sum, d) => sum + _getHourlyWage15xValue(d.hourlyWage, d.year), 0) / totalCount 
            : 0;
        
        // 평균 시급 표시용 포맷
        const avgHourlyWageDisplay = settings.isDecimalMode && !showAsInteger 
            ? _formatCurrency(avgHourlyWage1x, 2)
            : _formatCurrency(Math.round(avgHourlyWage1x));
        const avgHourlyWage15xDisplay = settings.isDecimalMode && !showAsInteger 
            ? _formatCurrency(avgHourlyWage15x, 2)
            : _formatCurrency(Math.round(avgHourlyWage15x));
        
        // 소수점 안내 문구 (정수 표시 체크 시에만)
        const decimalNotice = settings.isDecimalMode && showAsInteger 
            ? '<div style="background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;padding:8px 12px;border-radius:4px;font-size:10px;margin-bottom:10px;">⚠️ 시급은 정수로 표시되어 있으나, 실제 값은 소수점이 포함되어 있습니다.</div>'
            : '';
        
        // 인쇄 내용
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>급여현황표 ${settings.year}년 ${settings.month}월</title>
                ${printStyles}
            </head>
            <body>
                <h1>급여 현황표</h1>
                <div class="info">
                    기준일: ${settings.targetDate} | 총 ${totalCount}명
                </div>
                ${decimalNotice}
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>부서</th>
                            <th>이름</th>
                            <th>직급</th>
                            <th>호봉</th>
                            <th>직위</th>
                            <th>급여방식</th>
                            <th>기본급</th>
                            <th>직책수당</th>
                            <th>명절휴가비<br>${settings.holidayBonusMethod === 'monthly' ? `(${settings.holidayBonusMonthlyRate}%)` : '(월환산)'}</th>
                            <th>통상임금</th>
                            <th>주근로<br>시간</th>
                            <th>월소정<br>근로시간</th>
                            <th>시급<br>(1배)</th>
                            <th>시급<br>(1.5배)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_salaryStatusData.map((d, index) => {
                            const name = d.employee?.personalInfo?.name || '-';
                            const dept = d.assignment?.dept || '-';
                            const payTypeClass = d.isRankBased ? 'rank-based' : 'salary-based';
                            const payType = d.isRankBased ? '호봉제' : '연봉제';
                            
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${_escapeHtml(dept)}</td>
                                    <td class="name-col">${_escapeHtml(name)}</td>
                                    <td>${_escapeHtml(d.grade || '-')}</td>
                                    <td>${d.isRankBased && d.rank ? d.rank : '-'}</td>
                                    <td>${_escapeHtml(d.position || '-')}</td>
                                    <td class="${payTypeClass}">${payType}</td>
                                    <td class="number-col">${_formatCurrency(d.baseSalary)}</td>
                                    <td class="number-col">${_formatCurrency(d.positionAllowance)}</td>
                                    <td class="number-col">${_formatCurrency(d.monthlyHolidayBonus)}</td>
                                    <td class="number-col">${_formatCurrency(d.ordinaryWage)}</td>
                                    <td class="number-col">${d.weeklyWorkingHours || 40}</td>
                                    <td class="number-col">${d.monthlyWorkingHours || 209}</td>
                                    <td class="number-col">${_getHourlyWage1xDisplay(d.hourlyWage, d.year)}</td>
                                    <td class="number-col">${_getHourlyWage15xDisplay(d.hourlyWage, d.year)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7">합계 / 평균</td>
                            <td class="number-col">${_formatCurrency(totalBaseSalary)}</td>
                            <td class="number-col">${_formatCurrency(_salaryStatusData.reduce((sum, d) => sum + (d.positionAllowance || 0), 0))}</td>
                            <td class="number-col">${_formatCurrency(_salaryStatusData.reduce((sum, d) => sum + (d.monthlyHolidayBonus || 0), 0))}</td>
                            <td class="number-col">${_formatCurrency(totalOrdinaryWage)}</td>
                            <td>-</td>
                            <td>-</td>
                            <td class="number-col">${avgHourlyWageDisplay}</td>
                            <td class="number-col">${avgHourlyWage15xDisplay}</td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;
        
        // 인쇄 창 열기
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.print();
        };
        
        로거_인사?.info('급여 현황표 인쇄', { count: _salaryStatusData.length });
        
    } catch (error) {
        로거_인사?.error('급여 현황표 인쇄 실패', error);
        에러처리_인사?.warn('인쇄 중 오류가 발생했습니다.');
    }
}

// ===== 유틸리티 =====

/**
 * 숫자 포맷 (천 단위 콤마)
 * @private
 * @param {number} num - 숫자
 * @param {number} decimals - 소수점 자릿수 (기본값: 0)
 * @returns {string} 포맷된 문자열
 */
function _formatCurrency(num, decimals = 0) {
    if (!num && num !== 0) return '-';
    if (decimals > 0) {
        return Number(num).toLocaleString('ko-KR', { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });
    }
    return Number(num).toLocaleString('ko-KR');
}

/**
 * 시급(1배) 원본값 계산
 * @private
 * @param {number} hourlyWage - SalaryCalculator가 반환한 시급
 * @param {number} year - 연도
 * @returns {number} 시급(1배) - 설정에 따라 소수점 또는 정수
 */
function _getHourlyWage1xValue(hourlyWage, year) {
    try {
        if (!hourlyWage) return 0;
        
        // ⭐ [v1.6.0] SalaryCalculator.getRatedHourlyWage 사용
        if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
            return SalaryCalculator.getRatedHourlyWage(hourlyWage, 1, year);
        }
        
        // fallback: 기존 방식
        const settings = SalarySettingsManager?.getOrdinarySettingsByYear?.(year) || {};
        const rounding = settings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor' };
        
        if (rounding.type === 'decimal') {
            // 소수점 유지 설정: 원본값 그대로
            return hourlyWage;
        }
        
        // 정수 처리 설정: 이미 적용된 값 반환
        return Math.floor(hourlyWage);
    } catch (error) {
        로거_인사?.error('_getHourlyWage1xValue 오류', error);
        return hourlyWage || 0;
    }
}

/**
 * 시급(1.5배) 원본값 계산
 * @private
 * @param {number} hourlyWage - SalaryCalculator가 반환한 시급 (원시급)
 * @param {number} year - 연도
 * @returns {number} 시급(1.5배) - 설정에 따라 소수점 또는 정수
 * 
 * ⭐ [v1.6.0] applyTiming 설정 반영
 * - 'after' (기본값): 원시급 × 1.5 → 절사
 * - 'before': 원시급 → 절사 → × 1.5
 */
function _getHourlyWage15xValue(hourlyWage, year) {
    try {
        if (!hourlyWage) return 0;
        
        // ⭐ [v1.6.0] SalaryCalculator.getRatedHourlyWage 사용
        if (typeof SalaryCalculator !== 'undefined' && SalaryCalculator.getRatedHourlyWage) {
            return SalaryCalculator.getRatedHourlyWage(hourlyWage, 1.5, year);
        }
        
        // fallback: 기존 방식 (절사된 시급 × 1.5)
        const settings = SalarySettingsManager?.getOrdinarySettingsByYear?.(year) || {};
        const rounding = settings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor' };
        
        // 시급(1배) 원본값
        const hourly1x = _getHourlyWage1xValue(hourlyWage, year);
        
        // 1.5배 계산
        const raw15 = hourly1x * 1.5;
        
        if (rounding.type === 'decimal') {
            // 소수점 유지 설정: 소수점 그대로
            return raw15;
        }
        
        // 정수 처리 설정: 설정된 단위/방식으로 절사
        const unit = rounding.unit || 1;
        const method = rounding.method || 'floor';
        
        switch (method) {
            case 'ceil':
                return Math.ceil(raw15 / unit) * unit;
            case 'round':
                return Math.round(raw15 / unit) * unit;
            case 'floor':
            default:
                return Math.floor(raw15 / unit) * unit;
        }
    } catch (error) {
        로거_인사?.error('_getHourlyWage15xValue 오류', error);
        return (hourlyWage || 0) * 1.5;
    }
}

/**
 * 시급(1배) 화면 표시용 (체크박스 상태 반영)
 * @private
 * @param {number} hourlyWage - SalaryCalculator가 반환한 시급
 * @param {number} year - 연도
 * @returns {string} 포맷된 문자열
 */
function _getHourlyWage1xDisplay(hourlyWage, year) {
    const value = _getHourlyWage1xValue(hourlyWage, year);
    const settings = _salaryStatusSettings || {};
    const showAsInteger = document.getElementById('salaryStatusShowInteger')?.checked || false;
    
    if (settings.isDecimalMode && !showAsInteger) {
        // 소수점 유지 + 소수점 표시: 2자리
        return _formatCurrency(value, 2);
    }
    
    // 정수로 표시
    return _formatCurrency(Math.floor(value));
}

/**
 * 시급(1.5배) 화면 표시용 (체크박스 상태 반영)
 * @private
 * @param {number} hourlyWage - SalaryCalculator가 반환한 시급
 * @param {number} year - 연도
 * @returns {string} 포맷된 문자열
 */
function _getHourlyWage15xDisplay(hourlyWage, year) {
    const value = _getHourlyWage15xValue(hourlyWage, year);
    const settings = _salaryStatusSettings || {};
    const showAsInteger = document.getElementById('salaryStatusShowInteger')?.checked || false;
    
    if (settings.isDecimalMode && !showAsInteger) {
        // 소수점 유지 + 소수점 표시: 2자리
        return _formatCurrency(value, 2);
    }
    
    // 정수로 표시 (소수점 유지 설정이라도 체크 시 반올림)
    return _formatCurrency(Math.round(value));
}

/**
 * 소수점 옵션 힌트 메시지 업데이트
 * @private
 */
function _updateDecimalHint() {
    const hintEl = document.getElementById('salaryStatusDecimalHint');
    const isChecked = document.getElementById('salaryStatusShowInteger')?.checked || false;
    
    if (hintEl) {
        if (isChecked) {
            hintEl.innerHTML = '⚠️ <strong>주의:</strong> 화면과 인쇄에는 정수로 표시되지만, <strong>실제 값은 소수점이 포함</strong>되어 있습니다. 엑셀에는 원본 소수점 값이 저장됩니다.';
            hintEl.style.background = '#fef2f2';
            hintEl.style.color = '#991b1b';
            hintEl.style.padding = '8px 12px';
            hintEl.style.borderRadius = '4px';
            hintEl.style.border = '1px solid #fca5a5';
        } else {
            hintEl.innerHTML = '💡 급여설정이 "소수점 유지"로 되어 있어 시급이 소수점 2자리까지 표시됩니다.';
            hintEl.style.background = 'transparent';
            hintEl.style.color = '#92400e';
            hintEl.style.padding = '0';
            hintEl.style.border = 'none';
        }
    }
}

/**
 * 소수점 표시 옵션 변경 시 처리
 * @private
 */
function _onDecimalOptionChange() {
    // 힌트 메시지 업데이트
    _updateDecimalHint();
    
    // 데이터가 있으면 테이블 새로고침
    if (_salaryStatusData && _salaryStatusData.length > 0) {
        _renderSalaryStatusResult(_salaryStatusData);
    }
}

/**
 * HTML 이스케이프
 * @private
 * @param {string} str - 문자열
 * @returns {string} 이스케이프된 문자열
 */
function _escapeHtml(str) {
    if (typeof DOM유틸_인사 !== 'undefined') {
        return DOM유틸_인사.escapeHtml(str);
    }
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== 전역 등록 =====

if (typeof window !== 'undefined') {
    window.loadSalaryStatusModule = loadSalaryStatusModule;
    window.generateSalaryStatus = generateSalaryStatus;
    window.downloadSalaryStatusExcel = downloadSalaryStatusExcel;
    window.printSalaryStatus = printSalaryStatus;
}

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log('✅ 급여현황_인사.js 로드 완료');
}
