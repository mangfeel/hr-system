/**
 * 통계분석_인사.js - 프로덕션급
 * 
 * 교차 통계 분석 (Crosstab Analysis)
 * - 기준일 기준 재직자 통계
 * - 행/열 기준 자유 선택
 * - 다양한 분석 지표
 * - 엑셀 다운로드
 * 
 * @version 5.0.0
 * @since 2025-11-10
 * 
 * [변경 이력]
 * v5.0.0 (2026-01-22) ⭐ API 전용 버전
 *   - 직원유틸_인사.getDynamicRankInfo() await 추가
 *   - 호봉 계산 forEach → for...of (async/await 지원)
 *   - 모든 계산 로직 서버 API로 이동
 *
 * v4.0.0 (2026-01-22) API 연동 버전
 *   - RankCalculator.calculateCurrentRank → API_인사.calculateCurrentRank
 *   - TenureCalculator.calculate → API_인사.calculateTenure
 *   - _calculateStatValue() async 변경
 *   - forEach → for...of (async/await 지원)
 *
 * v1.2.1 - 육아휴직 상태 직원 통계 누락 버그 수정 (2026-01-21)
 *   ⭐ 버그 수정: 육아휴직 상태 직원이 통계에서 제외되던 문제
 *   - _isOnMaternityLeaveAtDate() 함수 신규 추가
 *   - 기준일이 실제 휴직 기간(startDate ~ endDate) 내에 있는지 판단
 *   - 미래 휴직 예정자도 기준일 기준으로 정확히 판단
 *   - _getActiveEmployeesAtDate() 함수 수정
 *   - status === '재직' 조건에 status === '육아휴직' 추가
 *   - "육아휴직자 포함" 옵션도 기준일 기반으로 동작
 *   - 예: 2026-01-01~12-31 휴직 예정자 → 2025-12-31 기준 통계에 포함됨
 *
 * v1.2.0 - UI/UX 전면 개편 (2025-12-04)
 *   ⭐ 목적 기반 UI로 재설계
 *   - "빠른 분석": 원클릭으로 자주 쓰는 통계 즉시 생성
 *     · 부서별 인원현황
 *     · 직위별 인원현황
 *     · 연령대별 분포
 *     · 근속별 분포
 *     · 직종별 현황
 *     · 부서×직위 교차분석
 *   - "상세 설정": 접어두고 필요시 펼침
 *   - 행 기준: 라디오 버튼 → 드롭다운 셀렉트
 *   - 분석 항목: 프리셋 버튼 (기본/상세/전체/초기화)
 *   - 사용자 친화적 용어 사용 (기술 용어 숨김)
 *   - 기존 기능 100% 하위 호환
 * 
 * v1.1.0 - 비고(상세내역) 표시/숨김 기능 추가 (2025-11-12)
 *   ⭐ 신규 기능: 비고(상세내역) 선택적 표시
 *   - "비고(상세내역) 표시" 체크박스 추가
 *   - 체크 ON: 비고 컬럼 표시 (내부 보고용)
 *   - 체크 OFF: 비고 컬럼 숨김 (외부 제출용)
 *   - 화면 표시, 엑셀 다운로드, 인쇄 모두 동일하게 적용
 *   - 1차원/2차원 분석 모두 지원
 *   - 법인, 시청, 도청, 국회 등 외부 제출 시 유용
 * 
 * v1.0.0 - 초기 버전 (2025-11-10)
 *   - 교차 통계 분석 기능
 *   - 1차원/2차원 분석 지원
 *   - 589,869가지 조합 가능
 * 
 * [주요 기능]
 * 1. 빠른 분석: 원클릭으로 자주 쓰는 통계 즉시 생성 ⭐ NEW
 * 2. 기준일 선택: 특정 날짜 기준 재직자만 분석
 * 3. 행 기준 선택: 부서, 직위, 직급, 직종, 성별, 연령대, 근속구간
 * 4. 열 기준 선택: 인원수, 성별분포, 평균호봉, 평균근속, 평균연령 등
 * 5. 교차 분석 테이블 생성
 * 6. 엑셀 다운로드
 * 7. 인쇄 (A4 세로/가로)
 * 8. 비고(상세내역) 표시/숨김 선택
 * 
 * [활용 사례]
 * - 법인, 시청, 도청, 국회 등에 제출할 통계 자료
 * - 부서별/직위별 인력 현황 분석
 * - 연령대별/근속년수별 분포 분석
 * - 내부 보고: 비고 포함 (상세 명단)
 * - 외부 제출: 비고 제외 (통계 수치만)
 * 
 * [하위 호환성]
 * - 기존 기능 100% 유지
 * - 기본값: 비고 표시 ON (기존 동작과 동일)
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 호봉계산기_인사.js (DateUtils, TenureCalculator, RankCalculator)
 * - 직원유틸_인사.js (직원유틸_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - 인쇄유틸_인사.js (인쇄유틸_인사) - 필수
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - XLSX (SheetJS) - 엑셀 다운로드
 */

// ===== 상수 정의 =====

/**
 * 행 기준 옵션
 */
const ROW_OPTIONS = [
    { id: 'all', label: '전체' },
    { id: 'dept', label: '부서' },
    { id: 'position', label: '직위' },
    { id: 'grade', label: '직급' },
    { id: 'jobType', label: '직종' },
    { id: 'gender', label: '성별' },
    { id: 'ageGroup', label: '연령대' },
    { id: 'tenureGroup', label: '근속구간' },
    { id: 'entryYear', label: '입사년도' }
];

/**
 * 열 기준 옵션
 */
const COLUMN_OPTIONS = [
    { id: 'count', label: '인원수', default: true },
    { id: 'genderDist', label: '성별분포', default: true },
    { id: 'avgRank', label: '평균호봉', default: true },
    { id: 'avgTenure', label: '평균근속', default: true },
    { id: 'avgAge', label: '평균연령', default: false },
    { id: 'cert1', label: '자격증1', default: false },
    { id: 'cert2', label: '자격증2', default: false },
    { id: 'rankBasedCount', label: '호봉제인원', default: false },
    { id: 'salaryBasedCount', label: '연봉제인원', default: false },
    { id: 'avgConvertedCareer', label: '평균환산경력', default: false },
    { id: 'careerHolderCount', label: '과거경력보유', default: false },
    { id: 'currentMaternityCount', label: '육아휴직중', default: false },
    { id: 'maternityHistoryCount', label: '육아휴직이력', default: false }
];

/**
 * ⭐ v1.2.0: 빠른 분석 프리셋
 * 자주 사용하는 분석 조합을 미리 정의
 */
const QUICK_PRESETS = [
    {
        id: 'dept',
        icon: '🏢',
        title: '부서별',
        subtitle: '인원현황',
        desc: '부서별 인원, 성별, 근속',
        row1: 'dept',
        row2: null,
        columns: ['count', 'genderDist', 'avgTenure']
    },
    {
        id: 'position',
        icon: '👔',
        title: '직위별',
        subtitle: '인원현황',
        desc: '직위별 인원, 성별, 호봉',
        row1: 'position',
        row2: null,
        columns: ['count', 'genderDist', 'avgRank']
    },
    {
        id: 'age',
        icon: '🎂',
        title: '연령대별',
        subtitle: '분포',
        desc: '연령대별 인원, 성별',
        row1: 'ageGroup',
        row2: null,
        columns: ['count', 'genderDist', 'avgTenure']
    },
    {
        id: 'tenure',
        icon: '📅',
        title: '근속별',
        subtitle: '분포',
        desc: '근속구간별 인원, 호봉',
        row1: 'tenureGroup',
        row2: null,
        columns: ['count', 'genderDist', 'avgRank']
    },
    {
        id: 'jobType',
        icon: '💼',
        title: '직종별',
        subtitle: '현황',
        desc: '직종별 인원, 호봉, 근속',
        row1: 'jobType',
        row2: null,
        columns: ['count', 'genderDist', 'avgRank', 'avgTenure']
    },
    {
        id: 'deptPosition',
        icon: '📊',
        title: '부서×직위',
        subtitle: '교차분석',
        desc: '부서와 직위 2차원 분석',
        row1: 'dept',
        row2: 'position',
        columns: ['count', 'genderDist']
    }
];

// ===== 메인 함수 =====

/**
 * 통계 분석 탭 로드
 * 
 * @description
 * 교차 통계 분석 화면을 초기화합니다.
 * - 기준일 설정 (오늘)
 * - 행/열 선택기 생성
 * - 기본 통계 표시
 * 
 * @example
 * loadStatisticsTab(); // 통계 분석 탭 로드
 */
function loadStatisticsTab() {
    try {
        로거_인사?.debug('통계 분석 탭 로드 시작');
        
        const statsDiv = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('module-statistics')
            : document.getElementById('module-statistics');
        
        if (!statsDiv) {
            로거_인사?.error('통계 분석 컨테이너를 찾을 수 없습니다');
            throw new Error('통계 분석 화면을 표시할 수 없습니다.');
        }
        
        // HTML 생성
        const html = _generateStatisticsHTML();
        statsDiv.innerHTML = html;
        
        // 오늘 날짜 설정 - 안전한 방식
        let today;
        if (typeof DateUtils !== 'undefined' && DateUtils.formatDate) {
            today = DateUtils.formatDate(new Date());
        } else {
            // DateUtils가 없으면 직접 포맷
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            today = `${year}-${month}-${day}`;
        }
        
        const baseDateInput = document.getElementById('stats-base-date');
        if (baseDateInput) {
            baseDateInput.value = today;
        }
        
        // ⭐ v1.2.0: 상세 설정 select 변경 시 숨김 필드 동기화
        const row1Select = document.getElementById('stats-row1-select');
        const row2Select = document.getElementById('stats-row2-select');
        const targetSelect = document.getElementById('stats-target-select');
        
        if (row1Select) {
            row1Select.addEventListener('change', syncAdvancedSettings);
        }
        if (row2Select) {
            row2Select.addEventListener('change', syncAdvancedSettings);
        }
        if (targetSelect) {
            targetSelect.addEventListener('change', syncAdvancedSettings);
        }
        
        // 분석 항목 체크박스 동기화
        COLUMN_OPTIONS.forEach(opt => {
            const checkbox = document.getElementById(`col-${opt.id}`);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    // 하위 호환용 숨김 필드도 동기화
                    const compatCheckbox = document.querySelector(`.column-options input[value="${opt.id}"]`);
                    if (compatCheckbox) {
                        compatCheckbox.checked = this.checked;
                    }
                });
            }
        });
        
        로거_인사?.info('통계 분석 탭 로드 완료');
        
    } catch (error) {
        console.error('[통계분석] loadStatisticsTab 에러:', error);
        로거_인사?.error('통계 분석 탭 로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '통계 분석 화면을 불러오는 중 오류가 발생했습니다.');
        } else {
            alert('❌ 통계 분석 화면을 불러오는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 통계 분석 HTML 생성 (Private)
 * 
 * @private
 * @returns {string} HTML 문자열
 * 
 * @description
 * v1.2.0: 목적 기반 UI로 전면 개편
 * - 빠른 분석: 원클릭으로 자주 쓰는 통계 생성
 * - 상세 설정: 접어두고 필요시 펼침
 * - 사용자 친화적 용어 사용
 */
function _generateStatisticsHTML() {
    // 빠른 분석 카드 생성
    const quickCardsHTML = QUICK_PRESETS.map(preset => `
        <div class="stats-quick-card" onclick="runQuickAnalysis('${preset.id}')" title="${preset.desc}">
            <div class="stats-quick-icon">${preset.icon}</div>
            <div class="stats-quick-title">${preset.title}</div>
            <div class="stats-quick-subtitle">${preset.subtitle}</div>
        </div>
    `).join('');
    
    return `
        <div class="statistics-container">
            <!-- 헤더 -->
            <div class="statistics-header">
                <h2>📊 교차 통계 분석</h2>
                <p class="text-muted">기준일 기준 재직자에 대한 다양한 통계를 확인할 수 있습니다.</p>
            </div>
            
            <!-- ========== 기본 조건 (항상 표시) ========== -->
            <div class="stats-conditions card">
                <div class="card-body">
                    <div class="stats-conditions-row">
                        <div class="stats-condition-item">
                            <label for="stats-base-date">📅 기준일</label>
                            <input type="date" class="form-control" id="stats-base-date">
                        </div>
                        <div class="stats-condition-item">
                            <label for="stats-target-select">👥 분석 대상</label>
                            <select class="form-control" id="stats-target-select">
                                <option value="all" selected>전체 직원</option>
                                <option value="rank">호봉제만</option>
                                <option value="salary">연봉제만</option>
                            </select>
                        </div>
                        <div class="stats-condition-item stats-condition-checks">
                            <label class="stats-check-label">
                                <input type="checkbox" id="stats-include-maternity" checked>
                                <span>육아휴직자 포함</span>
                            </label>
                            <label class="stats-check-label">
                                <input type="checkbox" id="stats-show-remarks" checked>
                                <span>비고(상세내역) 표시</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ========== 빠른 분석 ========== -->
            <div class="stats-quick-section">
                <div class="stats-section-title">
                    <span>🚀 빠른 분석</span>
                    <span class="stats-section-hint">클릭 한 번으로 자주 쓰는 통계를 바로 확인하세요</span>
                </div>
                <div class="stats-quick-cards">
                    ${quickCardsHTML}
                </div>
            </div>
            
            <!-- ========== 상세 설정 (접힘) ========== -->
            <div class="stats-advanced-section">
                <div class="stats-advanced-header" onclick="toggleAdvancedSettings()">
                    <span>⚙️ 상세 설정 (직접 조합하기)</span>
                    <span class="stats-advanced-toggle" id="stats-advanced-toggle">펼치기 ▼</span>
                </div>
                <div class="stats-advanced-body" id="stats-advanced-body" style="display: none;">
                    <!-- 그룹화 기준 -->
                    <div class="stats-setting-group">
                        <div class="stats-setting-title">📍 그룹화 기준</div>
                        <div class="stats-setting-content">
                            <div class="stats-row-selects">
                                <div class="stats-select-group">
                                    <label>1차 기준</label>
                                    <select class="form-control" id="stats-row1-select">
                                        ${ROW_OPTIONS.map((opt, idx) => `
                                            <option value="${opt.id}" ${idx === 1 ? 'selected' : ''}>${opt.label}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="stats-select-multiply">×</div>
                                <div class="stats-select-group">
                                    <label>2차 기준 (선택)</label>
                                    <select class="form-control" id="stats-row2-select">
                                        <option value="" selected>없음 (1차원 분석)</option>
                                        ${ROW_OPTIONS.filter(opt => opt.id !== 'all').map(opt => `
                                            <option value="${opt.id}">${opt.label}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="stats-example-hint">
                                💡 예: "부서 × 직위" 선택 시 부서별-직위별 교차 분석
                            </div>
                        </div>
                    </div>
                    
                    <!-- 분석 항목 -->
                    <div class="stats-setting-group">
                        <div class="stats-setting-title">📊 분석 항목</div>
                        <div class="stats-setting-content">
                            <div class="stats-column-presets">
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setColumnPreset('basic')">기본</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setColumnPreset('detail')">상세</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setColumnPreset('all')">전체</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setColumnPreset('none')">초기화</button>
                            </div>
                            <div class="stats-column-checks">
                                ${COLUMN_OPTIONS.map(opt => `
                                    <label class="stats-column-check">
                                        <input type="checkbox" id="col-${opt.id}" value="${opt.id}" ${opt.default ? 'checked' : ''}>
                                        <span>${opt.label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 생성 버튼 -->
                    <div class="stats-generate-area">
                        <button type="button" class="btn btn-primary btn-lg" onclick="generateStatistics()">
                            🔄 통계 생성
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- ========== 결과 영역 ========== -->
            <div class="statistics-result card" id="stats-result" style="display:none;">
                <div class="card-header stats-result-header">
                    <span class="stats-result-title" id="stats-result-title">분석 결과</span>
                    <div class="stats-result-actions">
                        <button type="button" class="btn btn-sm btn-success" onclick="exportStatisticsToExcel()" id="stats-export-btn">
                            📥 엑셀
                        </button>
                        <button type="button" class="btn btn-sm btn-info" onclick="printStatistics('portrait')" id="stats-print-portrait-btn">
                            🖨️ 세로인쇄
                        </button>
                        <button type="button" class="btn btn-sm btn-info" onclick="printStatistics('landscape')" id="stats-print-landscape-btn">
                            🖨️ 가로인쇄
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="stats-content"></div>
                </div>
            </div>
            
            <!-- 하위 호환용 숨김 필드 (기존 generateStatistics 함수 호환) -->
            <div style="display:none;">
                <input type="radio" name="rowOption1" id="row1-all" value="all">
                <input type="radio" name="rowOption1" id="row1-dept" value="dept" checked>
                <input type="radio" name="rowOption1" id="row1-position" value="position">
                <input type="radio" name="rowOption1" id="row1-grade" value="grade">
                <input type="radio" name="rowOption1" id="row1-jobType" value="jobType">
                <input type="radio" name="rowOption1" id="row1-gender" value="gender">
                <input type="radio" name="rowOption1" id="row1-ageGroup" value="ageGroup">
                <input type="radio" name="rowOption1" id="row1-tenureGroup" value="tenureGroup">
                <input type="radio" name="rowOption1" id="row1-entryYear" value="entryYear">
                <input type="checkbox" id="enable-row2">
                <input type="radio" name="rowOption2" id="row2-dept" value="dept" checked>
                <input type="radio" name="rowOption2" id="row2-position" value="position">
                <input type="radio" name="rowOption2" id="row2-grade" value="grade">
                <input type="radio" name="rowOption2" id="row2-jobType" value="jobType">
                <input type="radio" name="rowOption2" id="row2-gender" value="gender">
                <input type="radio" name="rowOption2" id="row2-ageGroup" value="ageGroup">
                <input type="radio" name="rowOption2" id="row2-tenureGroup" value="tenureGroup">
                <input type="radio" name="rowOption2" id="row2-entryYear" value="entryYear">
                <input type="radio" name="statsTarget" id="stats-target-all" value="all" checked>
                <input type="radio" name="statsTarget" id="stats-target-rank" value="rank">
                <input type="radio" name="statsTarget" id="stats-target-salary" value="salary">
                <div class="column-options">
                    ${COLUMN_OPTIONS.map(opt => `
                        <input type="checkbox" id="col-compat-${opt.id}" value="${opt.id}" ${opt.default ? 'checked' : ''}>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * 빠른 분석 실행
 * 
 * @param {string} presetId - 프리셋 ID
 * 
 * @description
 * v1.2.0: 원클릭 분석 기능
 * 미리 정의된 프리셋으로 즉시 통계 생성
 */
function runQuickAnalysis(presetId) {
    try {
        로거_인사?.debug('빠른 분석 실행', { presetId });
        
        const preset = QUICK_PRESETS.find(p => p.id === presetId);
        if (!preset) {
            console.error('프리셋을 찾을 수 없습니다:', presetId);
            return;
        }
        
        // 1. 기준일 확인
        const baseDate = document.getElementById('stats-base-date')?.value;
        if (!baseDate) {
            alert('⚠️ 기준일을 선택해주세요.');
            return;
        }
        
        // 2. 숨김 필드에 값 설정 (하위 호환)
        // 1차 행 기준
        ROW_OPTIONS.forEach(opt => {
            const radio = document.getElementById(`row1-${opt.id}`);
            if (radio) radio.checked = (opt.id === preset.row1);
        });
        
        // 2차 행 기준
        const enableRow2 = document.getElementById('enable-row2');
        if (enableRow2) {
            enableRow2.checked = !!preset.row2;
        }
        
        if (preset.row2) {
            ROW_OPTIONS.filter(opt => opt.id !== 'all').forEach(opt => {
                const radio = document.getElementById(`row2-${opt.id}`);
                if (radio) {
                    radio.checked = (opt.id === preset.row2);
                    radio.disabled = false;
                }
            });
        }
        
        // 열 기준 (분석 항목)
        COLUMN_OPTIONS.forEach(opt => {
            const checkbox = document.getElementById(`col-${opt.id}`);
            if (checkbox) {
                checkbox.checked = preset.columns.includes(opt.id);
            }
        });
        
        // 대상 타입 (새 UI에서 가져옴)
        const targetSelect = document.getElementById('stats-target-select');
        const targetValue = targetSelect?.value || 'all';
        document.getElementById(`stats-target-${targetValue}`).checked = true;
        
        // 3. 결과 타이틀 설정
        const resultTitle = document.getElementById('stats-result-title');
        if (resultTitle) {
            if (preset.row2) {
                resultTitle.textContent = `${preset.title} ${preset.subtitle}`;
            } else {
                resultTitle.textContent = `${preset.title} ${preset.subtitle}`;
            }
        }
        
        // 4. 통계 생성
        generateStatistics();
        
        로거_인사?.info('빠른 분석 완료', { presetId, preset: preset.title });
        
    } catch (error) {
        console.error('[통계분석] runQuickAnalysis 에러:', error);
        로거_인사?.error('빠른 분석 실패', error);
        alert('❌ 통계 분석 중 오류가 발생했습니다.');
    }
}

/**
 * 상세 설정 토글
 */
function toggleAdvancedSettings() {
    const body = document.getElementById('stats-advanced-body');
    const toggle = document.getElementById('stats-advanced-toggle');
    
    if (body && toggle) {
        if (body.style.display === 'none') {
            body.style.display = 'block';
            toggle.textContent = '접기 ▲';
        } else {
            body.style.display = 'none';
            toggle.textContent = '펼치기 ▼';
        }
    }
}

/**
 * 분석 항목 프리셋 설정
 * 
 * @param {string} preset - 'basic', 'detail', 'all', 'none'
 */
function setColumnPreset(preset) {
    const basicColumns = ['count', 'genderDist', 'avgRank', 'avgTenure'];
    const detailColumns = ['count', 'genderDist', 'avgRank', 'avgTenure', 'avgAge', 'cert1', 'cert2'];
    const allColumns = COLUMN_OPTIONS.map(opt => opt.id);
    
    let selectedColumns = [];
    
    switch (preset) {
        case 'basic':
            selectedColumns = basicColumns;
            break;
        case 'detail':
            selectedColumns = detailColumns;
            break;
        case 'all':
            selectedColumns = allColumns;
            break;
        case 'none':
            selectedColumns = [];
            break;
    }
    
    COLUMN_OPTIONS.forEach(opt => {
        const checkbox = document.getElementById(`col-${opt.id}`);
        if (checkbox) {
            checkbox.checked = selectedColumns.includes(opt.id);
        }
    });
}

/**
 * 상세 설정에서 통계 생성 전 필드 동기화
 * 
 * @description
 * 새 UI의 select 값을 기존 숨김 radio 필드에 동기화
 */
function syncAdvancedSettings() {
    // 1차 행 기준 동기화
    const row1Select = document.getElementById('stats-row1-select');
    if (row1Select) {
        ROW_OPTIONS.forEach(opt => {
            const radio = document.getElementById(`row1-${opt.id}`);
            if (radio) radio.checked = (opt.id === row1Select.value);
        });
    }
    
    // 2차 행 기준 동기화
    const row2Select = document.getElementById('stats-row2-select');
    const enableRow2 = document.getElementById('enable-row2');
    
    if (row2Select && enableRow2) {
        const row2Value = row2Select.value;
        enableRow2.checked = !!row2Value;
        
        if (row2Value) {
            ROW_OPTIONS.filter(opt => opt.id !== 'all').forEach(opt => {
                const radio = document.getElementById(`row2-${opt.id}`);
                if (radio) {
                    radio.checked = (opt.id === row2Value);
                    radio.disabled = false;
                }
            });
        }
    }
    
    // 대상 타입 동기화
    const targetSelect = document.getElementById('stats-target-select');
    if (targetSelect) {
        const targetValue = targetSelect.value;
        ['all', 'rank', 'salary'].forEach(val => {
            const radio = document.getElementById(`stats-target-${val}`);
            if (radio) radio.checked = (val === targetValue);
        });
    }
}

/**
 * 통계 생성
 * 
 * @description
 * 사용자가 선택한 옵션에 따라 교차 통계를 생성합니다.
 * 
 * @example
 * generateStatistics(); // 통계 생성
 */
function generateStatistics() {
    try {
        로거_인사?.debug('통계 생성 시작');
        
        // 1. 옵션 가져오기
        const baseDate = document.getElementById('stats-base-date')?.value;
        if (!baseDate) {
            alert('⚠️ 기준일을 선택해주세요.');
            return;
        }
        
        // 1차 행 기준
        const rowOption1 = document.querySelector('input[name="rowOption1"]:checked')?.value;
        if (!rowOption1) {
            alert('⚠️ 1차 행 기준을 선택해주세요.');
            return;
        }
        
        // 2차 행 기준 (선택)
        const enableRow2 = document.getElementById('enable-row2')?.checked;
        const rowOption2 = enableRow2 ? document.querySelector('input[name="rowOption2"]:checked')?.value : null;
        
        // 2차원 분석 시 1차와 2차가 같으면 안됨
        if (enableRow2 && rowOption1 === rowOption2) {
            alert('⚠️ 1차 기준과 2차 기준은 달라야 합니다.');
            return;
        }
        
        const columnOptions = Array.from(document.querySelectorAll('.column-options input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        if (columnOptions.length === 0) {
            alert('⚠️ 최소 하나의 분석 항목을 선택해주세요.');
            return;
        }
        
        로거_인사?.debug('통계 옵션 확인', { 
            baseDate, 
            rowOption1, 
            rowOption2: rowOption2 || '없음',
            is2D: !!rowOption2,
            columnOptions 
        });
        
        // ⭐ Phase 2-2: 육아휴직자 포함 옵션
        const includeMaternity = document.getElementById('stats-include-maternity')?.checked ?? true;
        
        // ⭐ Phase 2-1: 대상 직원 범위 옵션
        const targetType = document.querySelector('input[name="statsTarget"]:checked')?.value || 'all';
        
        로거_인사?.debug('육아휴직자 포함 옵션', { includeMaternity });
        로거_인사?.debug('대상 직원 범위', { targetType });
        
        // 2. 기준일 기준 재직자 가져오기
        const employees = _getActiveEmployeesAtDate(baseDate, includeMaternity, targetType);
        
        if (employees.length === 0) {
            alert('ℹ️ 해당 날짜에 재직 중인 직원이 없습니다.');
            return;
        }
        
        로거_인사?.debug('재직자 조회 완료', { count: employees.length });
        
        // 3. 통계 데이터 생성 (1차원 or 2차원)
        let statsData, html;
        
        if (rowOption2) {
            // 2차원 분석
            statsData = _generate2DStatisticsData(employees, baseDate, rowOption1, rowOption2, columnOptions);
            html = _generate2DStatisticsTableHTML(statsData, rowOption1, rowOption2, columnOptions);
        } else {
            // 1차원 분석 (기존)
            statsData = _generateStatisticsData(employees, baseDate, rowOption1, columnOptions);
            html = _generateStatisticsTableHTML(statsData, rowOption1, columnOptions);
        }
        
        // 4. HTML 생성 및 표시
        const resultDiv = document.getElementById('stats-result');
        const contentDiv = document.getElementById('stats-content');
        
        if (resultDiv && contentDiv) {
            contentDiv.innerHTML = html;
            resultDiv.style.display = 'block';
            
            // 엑셀 다운로드 버튼 활성화
            const exportBtn = document.getElementById('stats-export-btn');
            if (exportBtn) {
                exportBtn.disabled = false;
            }
            
            // ⭐ Phase 2-4: 인쇄 버튼 활성화
            const printPortraitBtn = document.getElementById('stats-print-portrait-btn');
            const printLandscapeBtn = document.getElementById('stats-print-landscape-btn');
            if (printPortraitBtn) {
                printPortraitBtn.disabled = false;
            }
            if (printLandscapeBtn) {
                printLandscapeBtn.disabled = false;
            }
        }
        
        로거_인사?.info('통계 생성 완료', { 
            rowCount: statsData.length,
            columnCount: columnOptions.length 
        });
        
    } catch (error) {
        // 디버깅: 에러 상세 출력
        console.error('=== 통계 생성 에러 ===');
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
        console.error('에러 객체:', error);
        
        로거_인사?.error('통계 생성 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '통계를 생성하는 중 오류가 발생했습니다.');
        } else {
            alert('❌ 통계를 생성하는 중 오류가 발생했습니다.\n' + error.message);
        }
    }
}

/**
 * 특정 시점의 급여방식 판단 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} targetDate - 기준일 (YYYY-MM-DD)
 * @returns {boolean} true: 호봉제, false: 연봉제
 * 
 * @description
 * Phase 3-5: 시점별 급여방식 판단
 * 
 * 판단 로직:
 * 1. targetDate 이전 가장 최근 발령의 급여방식 사용
 * 2. 해당 발령이 없으면 현재 급여방식 사용 (하위 호환)
 * 3. 발령에 급여방식이 없으면 현재 급여방식 사용 (하위 호환)
 * 
 * @example
 * // 2022년 통계 분석 시
 * const isRankBased = _getPaymentMethodAtDate(emp, '2022-12-31');
 * // 2022년 12월 31일 이전 가장 최근 발령의 급여방식 반환
 */
function _getPaymentMethodAtDate(emp, targetDate) {
    // 1. 발령 이력이 없는 경우 → 현재 급여방식 사용
    if (!emp.assignments || !Array.isArray(emp.assignments) || emp.assignments.length === 0) {
        return emp.salaryInfo?.isRankBased ?? 
               emp.rank?.isRankBased ?? 
               true;
    }
    
    // 2. targetDate 이전 발령 찾기 (시작일 기준)
    const validAssignments = emp.assignments
        .filter(a => a.startDate && a.startDate <= targetDate)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)); // 최신순 정렬
    
    // 3. 해당 기간의 발령이 없는 경우 → 현재 급여방식 사용
    if (validAssignments.length === 0) {
        return emp.salaryInfo?.isRankBased ?? 
               emp.rank?.isRankBased ?? 
               true;
    }
    
    // 4. 가장 최근 발령의 급여방식 사용
    const latestAssignment = validAssignments[0];
    
    // 4-1. 발령에 급여방식이 있는 경우 (Phase 3-1, 3-2 이후)
    if (latestAssignment.hasOwnProperty('isRankBased')) {
        return latestAssignment.isRankBased;
    }
    
    // 4-2. 발령에 급여방식이 없는 경우 (Phase 3-1 이전 데이터) → 현재 급여방식 사용
    return emp.salaryInfo?.isRankBased ?? 
           emp.rank?.isRankBased ?? 
           true;
}

/**
 * 기준일 시점의 육아휴직 여부 판단 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} baseDate - 기준일 (YYYY-MM-DD)
 * @returns {boolean} 기준일 시점에 육아휴직 중인지 여부
 * 
 * @since v1.2.1: 기준일 기반 육아휴직 판단 로직 추가
 * 
 * @description
 * 기준일이 실제 육아휴직 기간(startDate ~ endDate) 내에 있는지 확인합니다.
 * - 현재 진행 중인 육아휴직 확인
 * - 과거 육아휴직 이력도 확인 (이미 복직한 경우)
 */
function _isOnMaternityLeaveAtDate(emp, baseDate) {
    if (!emp.maternityLeave) {
        return false;
    }
    
    // 1. 현재 진행 중인 육아휴직 확인 (isOnLeave가 true인 경우)
    if (emp.maternityLeave.isOnLeave) {
        const startDate = emp.maternityLeave.startDate;
        const endDate = emp.maternityLeave.endDate;
        
        // 기준일이 휴직 시작일 이후이고 종료일 이전인 경우
        if (startDate && baseDate >= startDate) {
            if (!endDate || baseDate <= endDate) {
                return true;
            }
        }
    }
    
    // 2. 과거 육아휴직 이력 확인 (이미 복직한 경우도 포함)
    if (emp.maternityLeave.history && emp.maternityLeave.history.length > 0) {
        for (const leave of emp.maternityLeave.history) {
            const startDate = leave.startDate;
            // 실제 종료일(복직일)이 있으면 사용, 없으면 예정 종료일 사용
            const endDate = leave.actualEndDate || leave.endDate;
            
            // 기준일이 휴직 기간 내에 있는지 확인
            if (startDate && baseDate >= startDate) {
                if (endDate && baseDate <= endDate) {
                    return true;
                }
                // endDate가 없으면 아직 복직 안 한 상태 (현재 휴직 중)
                if (!endDate) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * 기준일 기준 재직자 가져오기 (Private)
 * 
 * @private
 * @param {string} baseDate - 기준일 (YYYY-MM-DD)
 * @param {boolean} includeMaternity - 육아휴직자 포함 여부 (기본값: true)
 * @param {string} targetType - 대상 직원 범위: 'all'(전체), 'rank'(호봉제), 'salary'(연봉제) (기본값: 'all')
 * @returns {Array<Object>} 재직자 배열
 * 
 * @since Phase 2-2: includeMaternity 파라미터 추가
 * @since Phase 2-1: targetType 파라미터 추가
 * @since v1.2.1: 기준일 기반 육아휴직 판단 로직 적용
 */
function _getActiveEmployeesAtDate(baseDate, includeMaternity = true, targetType = 'all') {
    const allEmployees = db.getEmployees();
    
    return allEmployees.filter(emp => {
        const entryDate = emp.employment?.entryDate;
        const retireDate = emp.employment?.retireDate;
        const status = emp.employment?.status;
        
        // 입사일이 기준일 이전이어야 함
        if (!entryDate || entryDate > baseDate) {
            return false;
        }
        
        // 재직자이거나 육아휴직자인 경우 (육아휴직 상태도 재직 중으로 간주)
        if (status === '재직' || status === '육아휴직') {
            // ⭐ v1.2.1: 기준일 시점의 육아휴직 여부 판단
            const isOnLeaveAtDate = _isOnMaternityLeaveAtDate(emp, baseDate);
            
            // ⭐ Phase 2-2: 육아휴직자 필터링 (기준일 기반)
            if (!includeMaternity && isOnLeaveAtDate) {
                return false;
            }
            
            // ⭐ Phase 2-1 & Phase 3-5: 호봉제/연봉제 필터링 (시점별)
            if (targetType !== 'all') {
                // Phase 3-5: 기준일 시점의 급여방식 판단
                const isRankBased = _getPaymentMethodAtDate(emp, baseDate);
                
                if (targetType === 'rank' && !isRankBased) {
                    return false; // 호봉제만 선택했는데 연봉제 직원
                }
                
                if (targetType === 'salary' && isRankBased) {
                    return false; // 연봉제만 선택했는데 호봉제 직원
                }
            }
            
            return true;
        }
        
        if (status === '퇴사' && retireDate) {
            return retireDate > baseDate;
        }
        
        return false;
    });
}

/**
 * 통계 데이터 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 배열
 * @param {string} baseDate - 기준일
 * @param {string} rowOption - 행 기준
 * @param {Array<string>} columnOptions - 열 기준 배열
 * @returns {Promise<Array<Object>>} 통계 데이터 배열
 */
async function _generateStatisticsData(employees, baseDate, rowOption, columnOptions) {
    // 1. 행 기준에 따라 그룹화
    const groups = await _groupEmployeesByRow(employees, rowOption, baseDate);
    
    // 2. 각 그룹별로 통계 계산
    const statsData = [];
    
    for (const [groupName, groupEmployees] of Object.entries(groups)) {
        const rowData = { 
            groupName,
            _employees: groupEmployees  // ⭐ 원본 직원 데이터 보관 (소계 재계산용)
        };
        
        // 각 열 기준에 대해 계산
        columnOptions.forEach(colOption => {
            rowData[colOption] = _calculateColumnValue(groupEmployees, colOption, baseDate);
        });
        
        statsData.push(rowData);
    }
    
    // 3. 그룹명으로 정렬 (체계적 정렬)
    statsData.sort((a, b) => {
        return _compareGroupNames(a.groupName, b.groupName, rowOption);
    });
    
    // ⭐ 합계 계산용 전체 직원 목록 추가
    statsData._allEmployees = employees;
    
    return statsData;
}

/**
 * 2차원 통계 데이터 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 배열
 * @param {string} baseDate - 기준일
 * @param {string} rowOption1 - 1차 행 기준
 * @param {string} rowOption2 - 2차 행 기준
 * @param {Array<string>} columnOptions - 열 기준 배열
 * @returns {Object} 2차원 통계 데이터 구조
 * 
 * @description
 * 1차 행 기준으로 그룹화한 후, 각 그룹 내에서 2차 행 기준으로 다시 그룹화합니다.
 * 
 * @example
 * // 부서 × 직위 교차 분석
 * const data = _generate2DStatisticsData(employees, '2025-11-10', 'dept', 'position', ['count', 'genderDist']);
 * // 결과:
 * // {
 * //   row1Groups: ['사회복지과', '요양보호과', '사무국'],
 * //   row2Groups: ['시설장', '부장', '과장', '대리', '사원'],
 * //   data: {
 * //     '사회복지과': {
 * //       '시설장': { count: '1명', genderDist: '남1/여0' },
 * //       '부장': { count: '2명', genderDist: '남1/여1' },
 * //       ...
 * //     },
 * //     ...
 * //   }
 * // }
 */
function _generate2DStatisticsData(employees, baseDate, rowOption1, rowOption2, columnOptions) {
    // 1. 1차 행 기준으로 그룹화 (⭐ v4.0.0: 동기 호출 불가, Promise 반환)
    // 이 함수는 내부적으로 비동기 래퍼를 사용합니다
    return _generate2DStatisticsDataAsync(employees, baseDate, rowOption1, rowOption2, columnOptions);
}

/**
 * 2D 통계 데이터 생성 (async wrapper)
 */
async function _generate2DStatisticsDataAsync(employees, baseDate, rowOption1, rowOption2, columnOptions) {
    // 1. 1차 행 기준으로 그룹화
    const row1Groups = await _groupEmployeesByRow(employees, rowOption1, baseDate);
    
    // 2. 2차원 데이터 구조 생성
    const data = {};
    const row1GroupNames = [];
    const row2GroupNames = new Set();
    
    // ⭐ 원본 직원 데이터 보관 추가
    const group1Employees = {};
    
    // 3. 각 1차 그룹에 대해 2차 그룹화 및 통계 계산
    for (const [group1Name, group1Emps] of Object.entries(row1Groups)) {
        row1GroupNames.push(group1Name);
        
        // ⭐ 1차 그룹의 원본 직원 저장 (소계 계산용)
        group1Employees[group1Name] = group1Emps;
        
        // 2차 행 기준으로 그룹화 (⭐ v4.0.0: await 추가)
        const row2Groups = await _groupEmployeesByRow(group1Emps, rowOption2, baseDate);
        
        data[group1Name] = {};
        
        for (const [group2Name, group2Employees] of Object.entries(row2Groups)) {
            row2GroupNames.add(group2Name);
            
            // 각 열 기준에 대해 통계 계산
            const cellData = {};
            columnOptions.forEach(colOption => {
                cellData[colOption] = _calculateColumnValue(group2Employees, colOption, baseDate);
            });
            
            data[group1Name][group2Name] = cellData;
        }
    }
    
    // 4. 그룹명 정렬
    row1GroupNames.sort((a, b) => _compareGroupNames(a, b, rowOption1));
    const sortedRow2Groups = Array.from(row2GroupNames).sort((a, b) => _compareGroupNames(a, b, rowOption2));
    
    return {
        row1Groups: row1GroupNames,
        row2Groups: sortedRow2Groups,
        data: data,
        
        // ⭐ 소계/합계 계산용 원본 데이터
        group1Employees: group1Employees,  // 소계용
        allEmployees: employees             // 합계용
    };
}

/**
 * 그룹명 비교 함수 (Private)
 * 
 * @private
 * @param {string} a - 그룹명 A
 * @param {string} b - 그룹명 B
 * @param {string} rowOption - 행 기준
 * @returns {number} 비교 결과
 * 
 * @description
 * 행 기준에 따라 적절한 정렬 방식 적용:
 * - 연령대: 20대 → 30대 → 40대 → 50대 → 60대 이상
 * - 근속구간: 1년 미만 → 1-3년 → 3-5년 → 5-10년 → 10년 이상
 * - 성별: 남 → 여
 * - 기타: 한글 가나다순
 */
function _compareGroupNames(a, b, rowOption) {
    // 미지정은 항상 마지막
    if (a === '미지정' && b !== '미지정') return 1;
    if (a !== '미지정' && b === '미지정') return -1;
    if (a === '미지정' && b === '미지정') return 0;
    
    // 연령대 정렬
    if (rowOption === 'ageGroup') {
        const ageOrder = ['20대', '30대', '40대', '50대', '60대 이상'];
        const aIndex = ageOrder.indexOf(a);
        const bIndex = ageOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
    }
    
    // 근속구간 정렬
    if (rowOption === 'tenureGroup') {
        const tenureOrder = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
        const aIndex = tenureOrder.indexOf(a);
        const bIndex = tenureOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
    }
    
    // 입사년도 정렬 (오름차순: 2020년 → 2021년 → 2022년...)
    if (rowOption === 'entryYear') {
        const aYear = parseInt(a.replace('년', ''));
        const bYear = parseInt(b.replace('년', ''));
        
        if (!isNaN(aYear) && !isNaN(bYear)) {
            return aYear - bYear;
        }
    }
    
    // 성별 정렬 (남 → 여)
    if (rowOption === 'gender') {
        if (a === '남' && b === '여') return -1;
        if (a === '여' && b === '남') return 1;
    }
    
    // 기본: 한글 가나다순
    return a.localeCompare(b, 'ko');
}

/**
 * 직원을 행 기준에 따라 그룹화 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 배열
 * @param {string} rowOption - 행 기준
 * @param {string} baseDate - 기준일
 * @returns {Promise<Object>} 그룹화된 직원 객체
 */
async function _groupEmployeesByRow(employees, rowOption, baseDate) {
    const groups = {};
    
    // ⭐ v4.0.0: forEach → for...of (async/await 지원)
    for (const emp of employees) {
        let groupName;
        
        switch (rowOption) {
            case 'all':
                groupName = '전체';
                break;
            case 'dept':
                groupName = emp.currentPosition?.dept || '미지정';
                break;
            case 'position':
                groupName = emp.currentPosition?.position || '미지정';
                break;
            case 'grade':
                groupName = emp.currentPosition?.grade || '미지정';
                break;
            case 'jobType':
                groupName = emp.currentPosition?.jobType || '미지정';
                break;
            case 'gender':
                groupName = emp.personalInfo?.gender || '미지정';
                break;
            case 'ageGroup':
                groupName = _getAgeGroup(emp.personalInfo?.birthDate, baseDate);
                break;
            case 'tenureGroup':
                // ⭐ v4.0.0: async 함수 호출
                groupName = await _getTenureGroup(emp.employment?.entryDate, baseDate);
                break;
            case 'entryYear':
                groupName = _getEntryYear(emp.employment?.entryDate);
                break;
            default:
                groupName = '미지정';
        }
        
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(emp);
    }
    
    return groups;
}

/**
 * 연령대 계산 (Private)
 * 
 * @private
 * @param {string} birthDate - 생년월일
 * @param {string} baseDate - 기준일
 * @returns {string} 연령대
 */
function _getAgeGroup(birthDate, baseDate) {
    if (!birthDate) return '미지정';
    
    const birth = new Date(birthDate);
    const base = new Date(baseDate);
    let age = base.getFullYear() - birth.getFullYear();
    
    // 생일이 지나지 않았으면 -1
    if (base.getMonth() < birth.getMonth() || 
        (base.getMonth() === birth.getMonth() && base.getDate() < birth.getDate())) {
        age--;
    }
    
    if (age < 20) return '20대 미만';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    if (age < 50) return '40대';
    if (age < 60) return '50대';
    return '60대 이상';
}

/**
 * 근속 구간 계산 (Private)
 * 
 * @private
 * @param {string} entryDate - 입사일
 * @param {string} baseDate - 기준일
 * @returns {Promise<string>} 근속 구간
 */
async function _getTenureGroup(entryDate, baseDate) {
    if (!entryDate) return '미지정';
    
    // ⭐ v4.0.0: API 우선 사용
    let tenureData;
    if (typeof API_인사 !== 'undefined') {
        tenureData = await API_인사.calculateTenure(entryDate, baseDate);
    } else {
        tenureData = TenureCalculator.calculate(entryDate, baseDate);
    }
    const years = tenureData.years;
    
    if (years < 1) return '1년 미만';
    if (years < 3) return '1-3년';
    if (years < 5) return '3-5년';
    if (years < 10) return '5-10년';
    return '10년 이상';
}

/**
 * 입사년도 계산 (Private)
 * 
 * @private
 * @param {string} entryDate - 입사일 (YYYY-MM-DD)
 * @returns {string} 입사년도 (YYYY년)
 */
function _getEntryYear(entryDate) {
    if (!entryDate) return '미지정';
    
    const year = entryDate.split('-')[0];
    return `${year}년`;
}

/**
 * 열 값 계산 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 배열
 * @param {string} columnOption - 열 기준
 * @param {string} baseDate - 기준일
 * @returns {any} 계산된 값
 */
function _calculateColumnValue(employees, columnOption, baseDate) {
    const count = employees.length;
    
    switch (columnOption) {
        case 'count': {
            // 비고: 직원 이름 목록 (가나다순)
            const names = employees
                .map(e => e.personalInfo?.name || e.name || '이름없음')
                .sort((a, b) => a.localeCompare(b, 'ko'));
            
            return {
                value: `${count}명`,
                remark: names.join(', ')
            };
        }
            
        case 'genderDist': {
            const male = employees.filter(e => e.personalInfo?.gender === '남').length;
            const female = employees.filter(e => e.personalInfo?.gender === '여').length;
            
            // 비고: 남성/여성 이름 목록
            const maleNames = employees
                .filter(e => e.personalInfo?.gender === '남')
                .map(e => e.personalInfo?.name || e.name || '이름없음')
                .sort((a, b) => a.localeCompare(b, 'ko'));
            
            const femaleNames = employees
                .filter(e => e.personalInfo?.gender === '여')
                .map(e => e.personalInfo?.name || e.name || '이름없음')
                .sort((a, b) => a.localeCompare(b, 'ko'));
            
            let remark = '';
            if (maleNames.length > 0) {
                remark += `남: ${maleNames.join(', ')}`;
            }
            if (femaleNames.length > 0) {
                if (remark) remark += '\n';
                remark += `여: ${femaleNames.join(', ')}`;
            }
            if (!remark) remark = '-';
            
            return {
                value: `남${male}/여${female}`,
                remark: remark
            };
        }
        
        case 'avgRank': {
            try {
                const rankBased = employees.filter(e => {
                    const hasValidFirstUpgradeDate = 
                        e.rank?.firstUpgradeDate && 
                        e.rank.firstUpgradeDate !== '' && 
                        e.rank.firstUpgradeDate !== '-';
                    const isRankBased = e.rank?.isRankBased !== false && hasValidFirstUpgradeDate;
                    
                    // 디버깅
                    if (!isRankBased && e.rank?.firstUpgradeDate) {
                        console.log('호봉제 제외됨:', {
                            name: e.personalInfo?.name || e.name,
                            isRankBased: e.rank?.isRankBased,
                            firstUpgradeDate: e.rank?.firstUpgradeDate
                        });
                    }
                    
                    return isRankBased;
                });
                
                console.log('호봉제 직원 수:', rankBased.length, '/ 전체:', employees.length);
                
                if (rankBased.length === 0) {
                    return {
                        value: '-',
                        remark: '-'
                    };
                }
                
                let totalRank = 0;
                let validCount = 0;
                const rankDetails = []; // ⭐ 비고용 상세 정보
                
                // ⭐ v5.0.0: forEach → for...of (async/await 지원)
                for (const e of rankBased) {
                    try {
                        const name = e.personalInfo?.name || e.name;
                        
                        // ⭐ v5.0.0: 직원유틸의 동적 호봉 계산 함수 사용 (인정율 반영) - await 추가
                        let currentRank;
                        
                        if (typeof 직원유틸_인사 !== 'undefined' && typeof 직원유틸_인사.getDynamicRankInfo === 'function') {
                            const rankInfo = await 직원유틸_인사.getDynamicRankInfo(e, baseDate);
                            currentRank = rankInfo.currentRank;
                            
                            if (currentRank === '-') {
                                console.log('필수 데이터 없음 (동적 계산):', name);
                                continue; // 스킵 (return → continue)
                            }
                        } else {
                            // Fallback: 기존 방식
                            // 필수 데이터 확인
                            if (!e.employment?.entryDate || !e.rank?.firstUpgradeDate) {
                                console.log('필수 데이터 없음:', name, {
                                    entryDate: e.employment?.entryDate,
                                    firstUpgradeDate: e.rank?.firstUpgradeDate
                                });
                                continue; // 스킵 (return → continue)
                            }
                            
                            const startRank = e.rank.startRank || 1;
                            
                            console.log('호봉 계산 시도:', name, {
                                startRank: startRank,
                                firstUpgradeDate: e.rank.firstUpgradeDate,
                                baseDate: baseDate
                            });
                            
                            try {
                                currentRank = RankCalculator.calculateCurrentRank(
                                    startRank,
                                    e.rank.firstUpgradeDate,
                                    baseDate
                                );
                            } catch (calcError) {
                                console.error('RankCalculator.calculateCurrentRank 오류:', name, calcError);
                                currentRank = null;
                            }
                        }
                        
                        console.log('호봉 계산 결과:', name, currentRank);
                        
                        if (typeof currentRank === 'number') {
                            totalRank += currentRank;
                            validCount++;
                            // ⭐ 비고용 상세 정보 수집
                            rankDetails.push({ name, rank: currentRank });
                            console.log('✅ 호봉 추가:', name, '현재호봉:', currentRank);
                        } else {
                            console.warn('⚠️ 계산 실패 - 제외:', name, currentRank);
                        }
                    } catch (err) {
                        console.error('호봉 계산 실패:', e.uniqueCode, err);
                        console.error('에러 스택:', err.stack);
                        // 개별 직원 계산 실패는 무시하고 계속
                    }
                }
                
                if (validCount === 0) {
                    return {
                        value: '-',
                        remark: '-'
                    };
                }
                
                const avg = Math.round(totalRank / validCount * 10) / 10;
                
                // ⭐ 비고: 이름(호봉) 형식으로 정렬
                const remark = rankDetails
                    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                    .map(d => `${d.name}(${d.rank}호)`)
                    .join(', ');
                
                return {
                    value: `${avg}호봉`,
                    remark: remark
                };
            } catch (error) {
                console.error('평균호봉 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'avgTenure': {
            const tenureDetails = [];
            
            const totalMonths = employees.reduce((sum, e) => {
                const tenure = TenureCalculator.calculate(e.employment?.entryDate, baseDate);
                const months = tenure.years * 12 + tenure.months;
                
                // ⭐ 비고용 상세 정보
                const name = e.personalInfo?.name || e.name || '이름없음';
                tenureDetails.push({
                    name,
                    years: tenure.years,
                    months: tenure.months
                });
                
                return sum + months;
            }, 0);
            
            const avgMonths = totalMonths / count;
            const years = Math.floor(avgMonths / 12);
            const months = Math.round(avgMonths % 12);
            
            // ⭐ 비고: 이름(근속연수) 형식
            const remark = tenureDetails
                .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                .map(d => `${d.name}(${d.years}년 ${d.months}개월)`)
                .join(', ');
            
            return {
                value: `${years}년 ${months}개월`,
                remark: remark
            };
        }
        
        case 'avgAge': {
            const ageDetails = [];
            
            const totalAge = employees.reduce((sum, e) => {
                if (!e.personalInfo?.birthDate) return sum;
                
                const birth = new Date(e.personalInfo.birthDate);
                const base = new Date(baseDate);
                let age = base.getFullYear() - birth.getFullYear();
                
                if (base.getMonth() < birth.getMonth() || 
                    (base.getMonth() === birth.getMonth() && base.getDate() < birth.getDate())) {
                    age--;
                }
                
                // ⭐ 비고용 상세 정보
                const name = e.personalInfo?.name || e.name || '이름없음';
                ageDetails.push({ name, age });
                
                return sum + age;
            }, 0);
            
            const avg = Math.round(totalAge / count);
            
            // ⭐ 비고: 이름(나이) 형식
            const remark = ageDetails
                .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                .map(d => `${d.name}(${d.age}세)`)
                .join(', ');
            
            return {
                value: `${avg}세`,
                remark: remark || '-'
            };
        }
        
        case 'cert1': {
            // 자격증1 목록 및 인원수 계산
            const certCount = {};
            const certHolders = {}; // ⭐ 자격증별 보유자 이름
            
            employees.forEach(e => {
                const cert = e.certifications?.[0]?.name || 
                            e.qualifications?.cert1;
                if (cert && cert !== '-' && cert !== '') {
                    certCount[cert] = (certCount[cert] || 0) + 1;
                    
                    // ⭐ 보유자 이름 수집
                    if (!certHolders[cert]) certHolders[cert] = [];
                    const name = e.personalInfo?.name || e.name || '이름없음';
                    certHolders[cert].push(name);
                }
            });
            
            if (Object.keys(certCount).length === 0) {
                return {
                    value: '-',
                    remark: '-'
                };
            }
            
            // 자격증명 가나다순 정렬 후 "자격증명: N명" 형식으로 변환
            const certList = Object.keys(certCount)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => `${cert}: ${certCount[cert]}명`);
            
            // ⭐ 비고: 자격증별 보유자 목록
            const remarkLines = Object.keys(certCount)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => {
                    const names = certHolders[cert]
                        .sort((a, b) => a.localeCompare(b, 'ko'))
                        .join(', ');
                    return `${cert}: ${names}`;
                });
            
            return {
                value: certList.join(', '),
                remark: remarkLines.join('\n')
            };
        }
        
        case 'rankBasedCount': {
            try {
                const rankBasedEmps = employees.filter(e => {
                    try {
                        const hasValidFirstUpgradeDate = 
                            e.rank?.firstUpgradeDate && 
                            e.rank.firstUpgradeDate !== '' && 
                            e.rank.firstUpgradeDate !== '-';
                        return e.rank?.isRankBased !== false && hasValidFirstUpgradeDate;
                    } catch (err) {
                        return false;
                    }
                });
                
                // ⭐ 비고: 호봉제 직원 이름 목록
                const names = rankBasedEmps
                    .map(e => e.personalInfo?.name || e.name || '이름없음')
                    .sort((a, b) => a.localeCompare(b, 'ko'));
                
                return {
                    value: `${rankBasedEmps.length}명`,
                    remark: names.length > 0 ? names.join(', ') : '-'
                };
            } catch (error) {
                console.error('호봉제인원 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'cert2': {
            // 자격증2 목록 및 인원수 계산
            const certCount = {};
            const certHolders = {}; // ⭐ 자격증별 보유자 이름
            
            employees.forEach(e => {
                const cert = e.certifications?.[1]?.name || 
                            e.qualifications?.cert2;
                if (cert && cert !== '-' && cert !== '') {
                    certCount[cert] = (certCount[cert] || 0) + 1;
                    
                    // ⭐ 보유자 이름 수집
                    if (!certHolders[cert]) certHolders[cert] = [];
                    const name = e.personalInfo?.name || e.name || '이름없음';
                    certHolders[cert].push(name);
                }
            });
            
            if (Object.keys(certCount).length === 0) {
                return {
                    value: '-',
                    remark: '-'
                };
            }
            
            // 자격증명 가나다순 정렬 후 "자격증명: N명" 형식으로 변환
            const certList = Object.keys(certCount)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => `${cert}: ${certCount[cert]}명`);
            
            // ⭐ 비고: 자격증별 보유자 목록
            const remarkLines = Object.keys(certCount)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => {
                    const names = certHolders[cert]
                        .sort((a, b) => a.localeCompare(b, 'ko'))
                        .join(', ');
                    return `${cert}: ${names}`;
                });
            
            return {
                value: certList.join(', '),
                remark: remarkLines.join('\n')
            };
        }
        
        case 'salaryBasedCount': {
            // 연봉제인원 계산
            try {
                const salaryBasedEmps = employees.filter(e => {
                    const hasValidFirstUpgradeDate = 
                        e.rank?.firstUpgradeDate && 
                        e.rank?.firstUpgradeDate !== '' && 
                        e.rank?.firstUpgradeDate !== '-';
                    // 호봉제가 아닌 경우
                    return e.rank?.isRankBased === false || !hasValidFirstUpgradeDate;
                });
                
                // ⭐ 비고: 연봉제 직원 이름 목록
                const names = salaryBasedEmps
                    .map(e => e.personalInfo?.name || e.name || '이름없음')
                    .sort((a, b) => a.localeCompare(b, 'ko'));
                
                return {
                    value: `${salaryBasedEmps.length}명`,
                    remark: names.length > 0 ? names.join(', ') : '-'
                };
            } catch (error) {
                console.error('연봉제인원 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'avgConvertedCareer': {
            // 평균 환산경력 계산
            try {
                const employeesWithCareer = employees.filter(e => 
                    e.pastCareers && Array.isArray(e.pastCareers) && e.pastCareers.length > 0
                );
                
                if (employeesWithCareer.length === 0) {
                    return {
                        value: '-',
                        remark: '-'
                    };
                }
                
                let totalYears = 0;
                let totalMonths = 0;
                let totalDays = 0;
                const careerDetails = []; // ⭐ 비고용 상세 정보
                
                employeesWithCareer.forEach(e => {
                    let empTotalMonths = 0;
                    
                    e.pastCareers.forEach(career => {
                        try {
                            const period = TenureCalculator.calculate(
                                career.startDate, 
                                career.endDate
                            );
                            const rate = career.rate || 100;
                            
                            // 환산 적용
                            const convertedMonths = (period.years * 12 + period.months + period.days / 30) * (rate / 100);
                            totalMonths += convertedMonths;
                            empTotalMonths += convertedMonths;
                        } catch (err) {
                            // 개별 경력 계산 실패는 무시
                        }
                    });
                    
                    // ⭐ 직원별 환산경력 저장
                    const name = e.personalInfo?.name || e.name || '이름없음';
                    const years = Math.floor(empTotalMonths / 12);
                    const months = Math.round(empTotalMonths % 12);
                    careerDetails.push({ name, years, months });
                });
                
                // 평균 계산
                const avgMonths = totalMonths / employeesWithCareer.length;
                const avgYears = Math.floor(avgMonths / 12);
                const avgRemainingMonths = Math.round(avgMonths % 12);
                
                // ⭐ 비고: 이름(환산경력) 형식
                const remark = careerDetails
                    .sort((a, b) => a.name.localeCompare(b, 'ko'))
                    .map(d => `${d.name}(${d.years}년 ${d.months}개월)`)
                    .join(', ');
                
                return {
                    value: `${avgYears}년 ${avgRemainingMonths}개월`,
                    remark: remark
                };
            } catch (error) {
                console.error('평균환산경력 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'careerHolderCount': {
            // 과거경력 보유 인원
            try {
                const careerHolders = employees.filter(e => 
                    e.pastCareers && Array.isArray(e.pastCareers) && e.pastCareers.length > 0
                );
                
                // ⭐ 비고: 과거경력 보유자 이름 목록
                const names = careerHolders
                    .map(e => e.personalInfo?.name || e.name || '이름없음')
                    .sort((a, b) => a.localeCompare(b, 'ko'));
                
                return {
                    value: `${careerHolders.length}명`,
                    remark: names.length > 0 ? names.join(', ') : '-'
                };
            } catch (error) {
                console.error('과거경력보유 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'currentMaternityCount': {
            // 현재 육아휴직 중인 인원 (기준일 기준)
            try {
                const onMaternity = employees.filter(e => {
                    if (!e.maternityLeave) return false;
                    
                    // 배열 형식 (여러 번 가능)
                    if (Array.isArray(e.maternityLeave)) {
                        return e.maternityLeave.some(leave => {
                            const start = leave.startDate;
                            const end = leave.endDate;
                            return start && end && start <= baseDate && baseDate <= end;
                        });
                    }
                    
                    // 객체 형식 (1번만)
                    const start = e.maternityLeave.startDate;
                    const end = e.maternityLeave.endDate;
                    return start && end && start <= baseDate && baseDate <= end;
                });
                
                // ⭐ 비고: 육아휴직 중인 직원 이름 목록
                const names = onMaternity
                    .map(e => e.personalInfo?.name || e.name || '이름없음')
                    .sort((a, b) => a.localeCompare(b, 'ko'));
                
                return {
                    value: `${onMaternity.length}명`,
                    remark: names.length > 0 ? names.join(', ') : '-'
                };
            } catch (error) {
                console.error('육아휴직중 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        case 'maternityHistoryCount': {
            // 육아휴직 사용 이력이 있는 인원
            try {
                const withHistory = employees.filter(e => {
                    if (!e.maternityLeave) return false;
                    
                    // 배열 형식
                    if (Array.isArray(e.maternityLeave)) {
                        return e.maternityLeave.length > 0;
                    }
                    
                    // 객체 형식
                    return e.maternityLeave.startDate && e.maternityLeave.endDate;
                });
                
                // ⭐ 비고: 육아휴직 이력이 있는 직원 이름 + 기간 정보
                const detailedInfo = withHistory
                    .map(e => {
                        const name = e.personalInfo?.name || e.name || '이름없음';
                        let periods = [];
                        
                        // 배열 형식: 모든 육아휴직 기간
                        if (Array.isArray(e.maternityLeave)) {
                            periods = e.maternityLeave
                                .filter(leave => leave.startDate && leave.endDate)
                                .map(leave => `${leave.startDate}~${leave.endDate}`);
                        } 
                        // 객체 형식: 단일 육아휴직 기간
                        else if (e.maternityLeave.startDate && e.maternityLeave.endDate) {
                            periods = [`${e.maternityLeave.startDate}~${e.maternityLeave.endDate}`];
                        }
                        
                        // 형식: "홍길동(2025-10-01~2026-12-31)"
                        // 여러 기간이 있으면: "홍길동(2024-01-01~2024-12-31, 2025-10-01~2026-12-31)"
                        return periods.length > 0 
                            ? `${name}(${periods.join(', ')})` 
                            : name;
                    })
                    .sort((a, b) => a.localeCompare(b, 'ko'));
                
                return {
                    value: `${withHistory.length}명`,
                    remark: detailedInfo.length > 0 ? detailedInfo.join(', ') : '-'
                };
            } catch (error) {
                console.error('육아휴직이력 계산 오류:', error);
                return {
                    value: '-',
                    remark: '-'
                };
            }
        }
        
        default:
            return {
                value: '-',
                remark: '-'
            };
    }
}

/**
 * 통계 테이블 HTML 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} statsData - 통계 데이터
 * @param {string} rowOption - 행 기준
 * @param {Array<string>} columnOptions - 열 기준 배열
 * @returns {string} HTML 문자열
 */
function _generateStatisticsTableHTML(statsData, rowOption, columnOptions) {
    const rowLabel = ROW_OPTIONS.find(opt => opt.id === rowOption)?.label || '구분';
    
    const columnLabels = columnOptions.map(colId => 
        COLUMN_OPTIONS.find(opt => opt.id === colId)?.label || colId
    );
    
    // ⭐ 비고 표시 여부 확인
    const showRemarks = document.getElementById('stats-show-remarks')?.checked ?? true;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover" id="stats-table">
                <thead class="thead-light">
                    <tr>
                        <th style="border: 1px solid #dee2e6;">${rowLabel}</th>
                        ${columnLabels.map(label => showRemarks ? `<th style="border: 1px solid #dee2e6;">${label}</th><th style="border: 1px solid #dee2e6;">비고</th>` : `<th style="border: 1px solid #dee2e6;">${label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // ⭐ 기준일 추출 (합계 재계산용)
    const baseDate = document.getElementById('stats-base-date')?.value;
    
    // 데이터 행
    statsData.forEach(row => {
        html += '<tr>';
        html += `<td style="border: 1px solid #dee2e6;"><strong>${row.groupName}</strong></td>`;
        
        columnOptions.forEach(colId => {
            const cellData = row[colId] || { value: '-', remark: '-' };
            // ⭐ value와 remark 분리 표시 (비고 표시 여부에 따라)
            html += `<td style="border: 1px solid #dee2e6; text-align: center;">${cellData.value || '-'}</td>`;
            if (showRemarks) {
                html += `<td style="border: 1px solid #dee2e6; font-size: 0.9em; white-space: pre-line;">${cellData.remark || '-'}</td>`;
            }
        });
        
        html += '</tr>';
    });
    
    // ⭐⭐⭐ 합계 행 수정 ⭐⭐⭐
    html += '<tr class="table-secondary"><td style="border: 1px solid #dee2e6;"><strong>전체</strong></td>';
    columnOptions.forEach(colId => {
        // ✅ 원본 데이터로 재계산
        const total = _calculateColumnValue(
            statsData._allEmployees,
            colId,
            baseDate
        );
        html += `<td style="border: 1px solid #dee2e6; text-align: center;"><strong>${total.value}</strong></td>`;
        if (showRemarks) {
            html += `<td style="border: 1px solid #dee2e6; font-size: 0.9em; white-space: pre-line;"><strong>${total.remark}</strong></td>`;
        }
    });
    html += '</tr>';
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

/**
 * 2차원 통계 테이블 HTML 생성 (Private)
 * 
 * @private
 * @param {Object} statsData - 2차원 통계 데이터
 * @param {string} rowOption1 - 1차 행 기준
 * @param {string} rowOption2 - 2차 행 기준
 * @param {Array<string>} columnOptions - 열 기준 배열
 * @returns {string} HTML 문자열
 * 
 * @description
 * 2차원 교차 분석 테이블을 생성합니다.
 * 예: 부서(행1) × 직위(행2) × 인원수/성별분포(열)
 * 
 * @example
 * // 테이블 구조:
 * // ┌──────────┬─────────┬──────────┬──────────┐
 * // │  부서    │  직위   │  인원수  │ 성별분포 │
 * // ├──────────┼─────────┼──────────┼──────────┤
 * // │사회복지과│ 시설장  │   1명    │  남1/여0 │
 * // │          ├─────────┼──────────┼──────────┤
 * // │          │  부장   │   2명    │  남1/여1 │
 * // │          ├─────────┼──────────┼──────────┤
 * // │          │  소계   │   3명    │  남2/여1 │
 * // ├──────────┼─────────┼──────────┼──────────┤
 * // │요양보호과│  과장   │   5명    │  남1/여4 │
 * // │          ├─────────┼──────────┼──────────┤
 * // │          │  소계   │   5명    │  남1/여4 │
 * // ├──────────┼─────────┼──────────┼──────────┤
 * // │  합계    │         │   8명    │  남3/여5 │
 * // └──────────┴─────────┴──────────┴──────────┘
 */
function _generate2DStatisticsTableHTML(statsData, rowOption1, rowOption2, columnOptions) {
    const row1Label = ROW_OPTIONS.find(opt => opt.id === rowOption1)?.label || '구분1';
    const row2Label = ROW_OPTIONS.find(opt => opt.id === rowOption2)?.label || '구분2';
    
    const columnLabels = columnOptions.map(colId => 
        COLUMN_OPTIONS.find(opt => opt.id === colId)?.label || colId
    );
    
    // ⭐ 비고 표시 여부 확인
    const showRemarks = document.getElementById('stats-show-remarks')?.checked ?? true;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover" id="stats-table">
                <thead class="thead-light">
                    <tr>
                        <th style="border: 1px solid #dee2e6;">${row1Label}</th>
                        <th style="border: 1px solid #dee2e6;">${row2Label}</th>
                        ${columnLabels.map(label => showRemarks ? `<th style="border: 1px solid #dee2e6;">${label}</th><th style="border: 1px solid #dee2e6;">비고</th>` : `<th style="border: 1px solid #dee2e6;">${label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // ⭐ 기준일 추출 (소계/합계 재계산용)
    const baseDate = document.getElementById('stats-base-date')?.value;
    
    // 전체 합계 계산용 데이터 수집
    const allCellsData = [];
    
    // 각 1차 그룹별 처리
    statsData.row1Groups.forEach(group1Name => {
        const group1Data = statsData.data[group1Name];
        
        if (!group1Data) return;
        
        // 해당 1차 그룹에 속하는 2차 그룹들
        const presentRow2Groups = statsData.row2Groups.filter(g2 => group1Data[g2]);
        
        if (presentRow2Groups.length === 0) return;
        
        // 첫 번째 2차 그룹 (rowspan 시작)
        let isFirstRow = true;
        const subtotalData = {}; // 소계 데이터
        
        presentRow2Groups.forEach(group2Name => {
            const cellData = group1Data[group2Name];
            
            if (!cellData) return;
            
            // 전체 합계용 데이터 수집
            allCellsData.push(cellData);
            
            // 소계 데이터 수집
            columnOptions.forEach(colId => {
                if (!subtotalData[colId]) subtotalData[colId] = [];
                subtotalData[colId].push(cellData[colId]);
            });
            
            html += '<tr>';
            
            // 1차 그룹명 (rowspan)
            if (isFirstRow) {
                html += `<td rowspan="${presentRow2Groups.length + 1}" style="border: 1px solid #dee2e6;"><strong>${group1Name}</strong></td>`;
                isFirstRow = false;
            }
            
            // 2차 그룹명
            html += `<td style="border: 1px solid #dee2e6;">${group2Name}</td>`;
            
            // ⭐ 각 열 데이터 + 비고 (비고 표시 여부에 따라)
            columnOptions.forEach(colId => {
                const data = cellData[colId] || { value: '-', remark: '-' };
                html += `<td style="border: 1px solid #dee2e6; text-align: center;">${data.value || '-'}</td>`;
                if (showRemarks) {
                    html += `<td style="border: 1px solid #dee2e6; font-size: 0.9em; white-space: pre-line;">${data.remark || '-'}</td>`;
                }
            });
            
            html += '</tr>';
        });
        
        // ⭐⭐⭐ 소계 행 수정 ⭐⭐⭐
        html += '<tr class="table-light">';
        html += `<td style="border: 1px solid #dee2e6;"><strong>소계</strong></td>`;
        
        columnOptions.forEach(colId => {
            // ✅ 원본 데이터로 재계산
            const subtotal = _calculateColumnValue(
                statsData.group1Employees[group1Name],
                colId,
                baseDate
            );
            html += `<td style="border: 1px solid #dee2e6; text-align: center;"><strong>${subtotal.value}</strong></td>`;
            if (showRemarks) {
                html += `<td style="border: 1px solid #dee2e6; font-size: 0.9em; white-space: pre-line;"><strong>${subtotal.remark}</strong></td>`;
            }
        });
        
        html += '</tr>';
    });
    
    // ⭐⭐⭐ 전체 합계 행 수정 ⭐⭐⭐
    html += '<tr class="table-secondary">';
    html += `<td colspan="2" style="border: 1px solid #dee2e6;"><strong>전체 합계</strong></td>`;
    
    columnOptions.forEach(colId => {
        // ✅ 원본 데이터로 재계산
        const total = _calculateColumnValue(
            statsData.allEmployees,
            colId,
            baseDate
        );
        html += `<td style="border: 1px solid #dee2e6; text-align: center;"><strong>${total.value}</strong></td>`;
        if (showRemarks) {
            html += `<td style="border: 1px solid #dee2e6; font-size: 0.9em; white-space: pre-line;"><strong>${total.remark}</strong></td>`;
        }
    });
    
    html += '</tr>';
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

/**
 * 2차원 소계/합계 계산 (Private)
 * 
 * @private
 * @param {Array<string>} values - 값 배열
 * @param {string} columnOption - 열 기준
 * @returns {string} 소계/합계 값
 * 
 * @description
 * 2차원 테이블의 소계/합계 행을 위한 집계 함수
 */
function _calculate2DSubtotal(values, columnOption) {
    if (!values || values.length === 0) return '-';
    
    switch (columnOption) {
        case 'count': {
            const total = values.reduce((sum, val) => {
                const count = parseInt(val) || 0;
                return sum + count;
            }, 0);
            return `${total}명`;
        }
        
        case 'genderDist': {
            let totalMale = 0;
            let totalFemale = 0;
            
            values.forEach(val => {
                if (!val || val === '-') return;
                const match = val.match(/남(\d+)\/여(\d+)/);
                if (match) {
                    totalMale += parseInt(match[1]);
                    totalFemale += parseInt(match[2]);
                }
            });
            
            return `남${totalMale}/여${totalFemale}`;
        }
        
        case 'avgRank': {
            let totalRank = 0;
            let validCount = 0;
            
            values.forEach(val => {
                if (!val || val === '-') return;
                const match = val.match(/([\d.]+)호봉/);
                if (match) {
                    totalRank += parseFloat(match[1]);
                    validCount++;
                }
            });
            
            if (validCount === 0) return '-';
            const avg = (totalRank / validCount).toFixed(1);
            return `${avg}호봉`;
        }
        
        case 'avgTenure':
        case 'avgAge': {
            let total = 0;
            let validCount = 0;
            
            values.forEach(val => {
                if (!val || val === '-') return;
                
                if (columnOption === 'avgTenure') {
                    // "N년 N개월" 형식 파싱
                    const match = val.match(/(\d+)년\s*(\d+)개월/);
                    if (match) {
                        const years = parseInt(match[1]);
                        const months = parseInt(match[2]);
                        total += (years * 12 + months); // 월 단위로 합산
                        validCount++;
                    }
                } else {
                    // avgAge: "N세" 또는 "N.N년" 형식
                    const match = val.match(/([\d.]+)/);
                    if (match) {
                        total += parseFloat(match[1]);
                        validCount++;
                    }
                }
            });
            
            if (validCount === 0) return '-';
            
            if (columnOption === 'avgTenure') {
                // 평균 월 수를 년/개월로 변환
                const avgMonths = total / validCount;
                const avgYears = Math.floor(avgMonths / 12);
                const avgRemainingMonths = Math.round(avgMonths % 12);
                return `${avgYears}년 ${avgRemainingMonths}개월`;
            } else {
                // avgAge
                const avg = (total / validCount).toFixed(1);
                return `${avg}세`;
            }
        }
        
        case 'rankBasedCount':
        case 'salaryBasedCount':
        case 'careerHolderCount':
        case 'currentMaternityCount':
        case 'maternityHistoryCount': {
            const total = values.reduce((sum, val) => {
                const count = parseInt(val) || 0;
                return sum + count;
            }, 0);
            return `${total}명`;
        }
        
        case 'cert1':
        case 'cert2': {
            // 자격증은 전체 통합 집계
            const allCerts = {};
            
            values.forEach(val => {
                if (!val || val === '-') return;
                
                // "자격증명: N명, 자격증명: N명" 파싱
                const matches = val.matchAll(/([^:]+):\s*(\d+)명/g);
                for (const match of matches) {
                    const certName = match[1].trim();
                    const count = parseInt(match[2]);
                    allCerts[certName] = (allCerts[certName] || 0) + count;
                }
            });
            
            if (Object.keys(allCerts).length === 0) return '-';
            
            const certList = Object.keys(allCerts)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => `${cert}: ${allCerts[cert]}명`);
            
            return certList.join(', ');
        }
        
        case 'avgConvertedCareer': {
            let totalMonths = 0;
            let validCount = 0;
            
            values.forEach(val => {
                if (!val || val === '-') return;
                const match = val.match(/(\d+)년\s*(\d+)개월/);
                if (match) {
                    const years = parseInt(match[1]);
                    const months = parseInt(match[2]);
                    totalMonths += (years * 12 + months);
                    validCount++;
                }
            });
            
            if (validCount === 0) return '-';
            
            const avgMonths = totalMonths / validCount;
            const avgYears = Math.floor(avgMonths / 12);
            const avgRemainingMonths = Math.round(avgMonths % 12);
            
            return `${avgYears}년 ${avgRemainingMonths}개월`;
        }
        
        default:
            return '-';
    }
}

/**
 * 합계 계산 (Private)
 * 
 * @private
 * @param {Array<Object>} statsData - 통계 데이터
 * @param {string} columnOption - 열 기준
 * @returns {string} 합계 값
 */
function _calculateTotalValue(statsData, columnOption) {
    switch (columnOption) {
        case 'count': {
            const total = statsData.reduce((sum, row) => {
                const count = parseInt(row[columnOption]) || 0;
                return sum + count;
            }, 0);
            return `${total}명`;
        }
        
        case 'genderDist': {
            let totalMale = 0;
            let totalFemale = 0;
            
            statsData.forEach(row => {
                const match = row[columnOption].match(/남(\d+)\/여(\d+)/);
                if (match) {
                    totalMale += parseInt(match[1]);
                    totalFemale += parseInt(match[2]);
                }
            });
            
            return `남${totalMale}/여${totalFemale}`;
        }
        
        case 'avgRank': {
            // 평균호봉의 평균 계산
            let totalRank = 0;
            let validCount = 0;
            
            statsData.forEach(row => {
                const match = row[columnOption].match(/([\d.]+)호봉/);
                if (match) {
                    totalRank += parseFloat(match[1]);
                    validCount++;
                }
            });
            
            if (validCount === 0) return '-';
            const avg = (totalRank / validCount).toFixed(1);
            return `${avg}호봉`;
        }
        
        case 'avgTenure':
        case 'avgAge': {
            // 평균의 평균 계산
            let total = 0;
            let validCount = 0;
            
            statsData.forEach(row => {
                if (columnOption === 'avgTenure') {
                    // "N년 N개월" 형식 파싱
                    const match = row[columnOption].match(/(\d+)년\s*(\d+)개월/);
                    if (match) {
                        const years = parseInt(match[1]);
                        const months = parseInt(match[2]);
                        total += (years * 12 + months); // 월 단위로 합산
                        validCount++;
                    }
                } else {
                    // avgAge: "N세" 또는 "N.N년" 형식
                    const match = row[columnOption].match(/([\d.]+)/);
                    if (match) {
                        total += parseFloat(match[1]);
                        validCount++;
                    }
                }
            });
            
            if (validCount === 0) return '-';
            
            if (columnOption === 'avgTenure') {
                // 평균 월 수를 년/개월로 변환
                const avgMonths = total / validCount;
                const avgYears = Math.floor(avgMonths / 12);
                const avgRemainingMonths = Math.round(avgMonths % 12);
                return `${avgYears}년 ${avgRemainingMonths}개월`;
            } else {
                // avgAge
                const avg = (total / validCount).toFixed(1);
                return `${avg}세`;
            }
        }
        
        case 'rankBasedCount':
        case 'salaryBasedCount':
        case 'careerHolderCount':
        case 'currentMaternityCount':
        case 'maternityHistoryCount': {
            // 인원수 합계
            const total = statsData.reduce((sum, row) => {
                const count = parseInt(row[columnOption]) || 0;
                return sum + count;
            }, 0);
            return `${total}명`;
        }
        
        case 'cert1':
        case 'cert2': {
            // 자격증은 전체 통합 집계
            const allCerts = {};
            
            statsData.forEach(row => {
                const value = row[columnOption];
                if (value && value !== '-') {
                    // "자격증명: N명, 자격증명: N명" 파싱
                    const matches = value.matchAll(/([^:]+):\s*(\d+)명/g);
                    for (const match of matches) {
                        const certName = match[1].trim();
                        const count = parseInt(match[2]);
                        allCerts[certName] = (allCerts[certName] || 0) + count;
                    }
                }
            });
            
            if (Object.keys(allCerts).length === 0) return '-';
            
            const certList = Object.keys(allCerts)
                .sort((a, b) => a.localeCompare(b, 'ko'))
                .map(cert => `${cert}: ${allCerts[cert]}명`);
            
            return certList.join(', ');
        }
        
        case 'avgConvertedCareer': {
            // 평균환산경력의 평균
            let totalMonths = 0;
            let validCount = 0;
            
            statsData.forEach(row => {
                const value = row[columnOption];
                if (value && value !== '-') {
                    const match = value.match(/(\d+)년\s*(\d+)개월/);
                    if (match) {
                        const years = parseInt(match[1]);
                        const months = parseInt(match[2]);
                        totalMonths += (years * 12 + months);
                        validCount++;
                    }
                }
            });
            
            if (validCount === 0) return '-';
            
            const avgMonths = totalMonths / validCount;
            const avgYears = Math.floor(avgMonths / 12);
            const avgRemainingMonths = Math.round(avgMonths % 12);
            
            return `${avgYears}년 ${avgRemainingMonths}개월`;
        }
        
        default:
            return '-';
    }
}

/**
 * 엑셀 다운로드
 * 
 * @description
 * 생성된 통계 테이블을 엑셀 파일로 다운로드합니다.
 * 
 * @example
 * exportStatisticsToExcel(); // 엑셀 다운로드
 */
function exportStatisticsToExcel() {
    try {
        로거_인사?.debug('통계 엑셀 다운로드 시작');
        
        const table = document.getElementById('stats-table');
        if (!table) {
            alert('⚠️ 먼저 통계를 생성해주세요.');
            return;
        }
        
        // SheetJS 확인
        if (typeof XLSX === 'undefined') {
            alert('❌ 엑셀 라이브러리를 불러올 수 없습니다.');
            로거_인사?.error('XLSX 라이브러리 없음');
            return;
        }
        
        // ⭐ 비고 표시 여부 확인
        const showRemarks = document.getElementById('stats-show-remarks')?.checked ?? true;
        
        let tableToExport = table;
        
        // ⭐ 비고 숨김 상태인 경우, 테이블 복제 후 비고 컬럼 제거
        if (!showRemarks) {
            tableToExport = table.cloneNode(true);
            
            // 모든 행에서 "비고" 헤더와 데이터 컬럼 제거
            const rows = tableToExport.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = Array.from(row.children);
                const cellsToRemove = [];
                
                // "비고" 텍스트를 가진 th 찾기 및 해당 인덱스의 td 제거
                cells.forEach((cell, index) => {
                    if (cell.tagName === 'TH' && cell.textContent.trim() === '비고') {
                        cellsToRemove.push(index);
                    }
                });
                
                // 헤더 행이 아닌 경우, 비고 데이터 컬럼 제거
                // (헤더의 비고 위치에 대응하는 td 제거)
                if (row.querySelector('th') === null) {
                    // 데이터 행: 홀수 인덱스의 셀이 비고 컬럼 (구분, 값, 비고, 값, 비고...)
                    const dataCells = Array.from(row.children);
                    for (let i = dataCells.length - 1; i >= 0; i--) {
                        // 첫 번째 열(구분)을 제외하고, 짝수 인덱스가 비고 컬럼
                        if (i > 0 && i % 2 === 0) {
                            dataCells[i].remove();
                        }
                    }
                } else {
                    // 헤더 행: "비고" th 제거
                    cellsToRemove.sort((a, b) => b - a); // 역순 정렬
                    cellsToRemove.forEach(index => {
                        if (cells[index]) {
                            cells[index].remove();
                        }
                    });
                }
            });
        }
        
        // 테이블을 워크북으로 변환
        const wb = XLSX.utils.table_to_book(tableToExport, { sheet: '교차통계' });
        
        // 파일명 생성 (1차원 or 2차원 대응)
        const baseDate = document.getElementById('stats-base-date')?.value || '';
        const enableRow2 = document.getElementById('enable-row2')?.checked;
        
        let filename;
        if (enableRow2) {
            // 2차원 분석
            const rowOption1 = document.querySelector('input[name="rowOption1"]:checked')?.value || '';
            const rowOption2 = document.querySelector('input[name="rowOption2"]:checked')?.value || '';
            const rowLabel1 = ROW_OPTIONS.find(opt => opt.id === rowOption1)?.label || '통계1';
            const rowLabel2 = ROW_OPTIONS.find(opt => opt.id === rowOption2)?.label || '통계2';
            filename = `교차통계_${rowLabel1}×${rowLabel2}_${baseDate}.xlsx`;
        } else {
            // 1차원 분석
            const rowOption = document.querySelector('input[name="rowOption1"]:checked')?.value || '';
            const rowLabel = ROW_OPTIONS.find(opt => opt.id === rowOption)?.label || '통계';
            filename = `교차통계_${rowLabel}_${baseDate}.xlsx`;
        }
        
        // 다운로드
        XLSX.writeFile(wb, filename);
        
        로거_인사?.info('통계 엑셀 다운로드 완료', { filename });
        
    } catch (error) {
        console.error('[통계분석] exportStatisticsToExcel 에러:', error);
        로거_인사?.error('통계 엑셀 다운로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '엑셀 다운로드 중 오류가 발생했습니다.');
        } else {
            alert('❌ 엑셀 다운로드 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 통계 인쇄
 * 
 * @param {string} orientation - 페이지 방향 ('portrait' 또는 'landscape')
 * 
 * @description
 * Phase 2-4: 통계 테이블 인쇄 기능
 * - A4 세로/가로 선택 가능
 * - 제목, 분석 정보, 비고 컬럼 모두 포함
 * - 인쇄유틸_인사.js 사용
 * 
 * @example
 * printStatistics('portrait');  // A4 세로
 * printStatistics('landscape'); // A4 가로
 */
function printStatistics(orientation = 'portrait') {
    try {
        로거_인사?.debug('통계 인쇄 시작', { orientation });
        
        // 1. 인쇄유틸 확인
        if (typeof 인쇄유틸_인사 === 'undefined') {
            alert('❌ 인쇄 기능을 사용할 수 없습니다.\n인쇄유틸_인사.js가 로드되지 않았습니다.');
            로거_인사?.warn('인쇄유틸을 찾을 수 없습니다');
            return;
        }
        
        // 2. 테이블 확인
        const statsTable = document.getElementById('stats-table');
        if (!statsTable) {
            alert('⚠️ 먼저 통계를 생성하세요.');
            로거_인사?.warn('통계 테이블을 찾을 수 없습니다');
            return;
        }
        
        // 3. 인쇄 영역 가져오기
        const printArea = document.getElementById('statistics-print-area');
        if (!printArea) {
            alert('❌ 인쇄 영역을 찾을 수 없습니다.');
            로거_인사?.error('statistics-print-area 요소가 없습니다');
            return;
        }
        
        // 4. 테이블 복제 (원본 보존)
        const clonedTable = statsTable.cloneNode(true);
        clonedTable.id = 'stats-table-print';  // ID 변경
        
        // ⭐ 비고 표시 여부 확인
        const showRemarks = document.getElementById('stats-show-remarks')?.checked ?? true;
        
        // ⭐ 비고 숨김 상태인 경우, 비고 컬럼 제거
        if (!showRemarks) {
            const rows = clonedTable.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = Array.from(row.children);
                const cellsToRemove = [];
                
                // "비고" 텍스트를 가진 th 찾기
                cells.forEach((cell, index) => {
                    if (cell.tagName === 'TH' && cell.textContent.trim() === '비고') {
                        cellsToRemove.push(index);
                    }
                });
                
                // 헤더 행이 아닌 경우, 비고 데이터 컬럼 제거
                if (row.querySelector('th') === null) {
                    // 데이터 행: 짝수 인덱스가 비고 컬럼 (첫 번째 열 제외)
                    const dataCells = Array.from(row.children);
                    for (let i = dataCells.length - 1; i >= 0; i--) {
                        if (i > 0 && i % 2 === 0) {
                            dataCells[i].remove();
                        }
                    }
                } else {
                    // 헤더 행: "비고" th 제거
                    cellsToRemove.sort((a, b) => b - a);
                    cellsToRemove.forEach(index => {
                        if (cells[index]) {
                            cells[index].remove();
                        }
                    });
                }
            });
        }
        
        // 5. 비고 컬럼 스타일 조정 (인쇄용) - 비고가 표시되는 경우만
        if (showRemarks) {
            const cells = clonedTable.querySelectorAll('td, th');
            cells.forEach(cell => {
                const currentStyle = cell.getAttribute('style') || '';
                
                // 비고 컬럼 감지
                const isRemarkColumn = currentStyle.includes('white-space: pre-line') || 
                                       currentStyle.includes('font-size: 0.9em') ||
                                       currentStyle.includes('font-size: 0.85em');
                
                if (isRemarkColumn) {
                    // 비고 컬럼은 폰트 작게, 줄바꿈 유지
                    cell.setAttribute('style', currentStyle + '; font-size: 0.75em; line-height: 1.3;');
                } else {
                    // 일반 셀은 가운데 정렬 유지
                    if (currentStyle.includes('text-align: center')) {
                        cell.setAttribute('style', currentStyle);
                    }
                }
            });
        }
        
        // 6. 분석 정보 생성
        const baseDate = document.getElementById('stats-base-date')?.value || '';
        const includeMaternity = document.getElementById('stats-include-maternity')?.checked ?? true;
        const targetType = document.querySelector('input[name="statsTarget"]:checked')?.value || 'all';
        const enableRow2 = document.getElementById('enable-row2')?.checked;
        
        let targetLabel;
        if (targetType === 'rank') targetLabel = '호봉제만';
        else if (targetType === 'salary') targetLabel = '연봉제만';
        else targetLabel = '전체 직원';
        
        let title = '📊 교차 통계 분석';
        let analysisInfo = '';
        
        if (enableRow2) {
            // 2차원 분석
            const rowOption1 = document.querySelector('input[name="rowOption1"]:checked')?.value || '';
            const rowOption2 = document.querySelector('input[name="rowOption2"]:checked')?.value || '';
            const rowLabel1 = ROW_OPTIONS.find(opt => opt.id === rowOption1)?.label || '통계1';
            const rowLabel2 = ROW_OPTIONS.find(opt => opt.id === rowOption2)?.label || '통계2';
            
            analysisInfo = `
                <div style="margin-bottom: 15px; padding: 10px;">
                    <div style="margin-bottom: 5px;"><strong>분석 대상:</strong> ${targetLabel}</div>
                    <div style="margin-bottom: 5px;"><strong>기준일:</strong> ${baseDate}</div>
                    <div style="margin-bottom: 5px;"><strong>육아휴직자:</strong> ${includeMaternity ? '포함' : '제외'}</div>
                    <div><strong>분석 유형:</strong> ${rowLabel1} × ${rowLabel2} (2차원)</div>
                </div>
            `;
        } else {
            // 1차원 분석
            const rowOption = document.querySelector('input[name="rowOption1"]:checked')?.value || '';
            const rowLabel = ROW_OPTIONS.find(opt => opt.id === rowOption)?.label || '통계';
            
            analysisInfo = `
                <div style="margin-bottom: 15px; padding: 10px;">
                    <div style="margin-bottom: 5px;"><strong>분석 대상:</strong> ${targetLabel}</div>
                    <div style="margin-bottom: 5px;"><strong>기준일:</strong> ${baseDate}</div>
                    <div style="margin-bottom: 5px;"><strong>육아휴직자:</strong> ${includeMaternity ? '포함' : '제외'}</div>
                    <div><strong>분석 기준:</strong> ${rowLabel}</div>
                </div>
            `;
        }
        
        // 7. 인쇄 영역에 제목 + 정보 + 테이블 설정
        printArea.innerHTML = `
            <h2 style="text-align: center; margin-bottom: 20px; page-break-after: avoid;">${title}</h2>
            ${analysisInfo}
            <div style="overflow-x: auto;"></div>
        `;
        
        // 테이블 추가
        printArea.querySelector('div').appendChild(clonedTable);
        
        // 8. 인쇄유틸 호출
        인쇄유틸_인사.print('statistics-print-area', orientation);
        
        로거_인사?.info('통계 인쇄 완료', { orientation });
        
    } catch (error) {
        console.error('[통계분석] printStatistics 에러:', error);
        로거_인사?.error('통계 인쇄 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '인쇄 중 오류가 발생했습니다.');
        } else {
            alert('❌ 인쇄 중 오류가 발생했습니다.\n' + error.message);
        }
    }
}
