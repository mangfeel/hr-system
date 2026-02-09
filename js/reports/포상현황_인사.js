/**
 * 포상현황_인사.js - 포상(표창) 현황 보고서 (통합 버전)
 * 
 * 7가지 보고서를 탭으로 선택하여 생성
 * 1. 직원별 포상내역 - 전체 포상 목록
 * 2. 직원별 외부포상 - 연도별 컬럼 + 이전이력
 * 3. 직원별 내부포상 - 연도별 컬럼 + 이전이력
 * 4. 연도별 포상내역 - 연도별 정렬
 * 5. 내부포상(선정) - 선정된 내부 포상
 * 6. 외부포상(선정) - 선정된 외부 포상
 * 7. 포상사진 출력 - A4 1건씩 사진 출력
 * 
 * @version 2.0.0
 * @since 2025-01-15
 * @location js/reports/포상현황_인사.js
 */

// ===== 전역 변수 =====
let currentReportTab = 'employee-awards';

// ===== 보고서 탭 정보 =====
const REPORT_TABS = {
    'basic': { name: '기본', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', desc: '전체 목록 + 필터' },
    'employee-awards': { name: '직원별 포상내역', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', desc: '전체 포상 목록' },
    'employee-external': { name: '직원별 외부포상', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', desc: '연도별 컬럼 형태' },
    'employee-internal': { name: '직원별 내부포상', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="10" y2="6"/><line x1="14" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/></svg>', desc: '연도별 컬럼 형태' },
    'yearly-awards': { name: '연도별 포상내역', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', desc: '연도별 정렬' },
    'internal-selected': { name: '내부포상(선정)', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>', desc: '선정된 내부 포상' },
    'external-selected': { name: '외부포상(선정)', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>', desc: '선정된 외부 포상' },
    'photo-print': { name: '포상사진 출력', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', desc: 'A4 사진 출력' }
};

// ===== 모듈 로드 =====

/**
 * 포상 현황 모듈 로드
 */
function loadAwardsReportModule() {
    로거_인사?.debug('포상 현황 모듈 로드');
    
    const container = document.getElementById('awards-report-module');
    if (!container) {
        로거_인사?.warn('포상 현황 컨테이너를 찾을 수 없습니다');
        return;
    }
    
 // 포상 데이터 재직/퇴사 상태 동기화
    _syncAwardsRetirementStatus();
    
    container.innerHTML = _renderAwardsReportUI();
    
 // 기본 탭 선택
    selectReportTab('basic');
}

/**
 * 포상 데이터의 재직/퇴사 상태를 DB 직원 정보와 동기화
 * @private
 */
function _syncAwardsRetirementStatus() {
    try {
        const awards = awardsManager.getAll();
        const employees = db.getEmployees();
        
 // 직원 이름 → 퇴사 여부 맵 생성
        const retirementMap = new Map();
        employees.forEach(emp => {
            const empName = emp.personalInfo?.name || emp.name;
            const isRetired = !!(emp.employment?.retirementDate || emp.retirementDate);
            
            if (empName) {
                retirementMap.set(empName, isRetired);
            }
        });
        
        let updatedCount = 0;
        
        awards.forEach(award => {
            if (award.name && retirementMap.has(award.name)) {
                const dbIsRetired = retirementMap.get(award.name);
                
 // DB 상태와 다르면 동기화
                if (award.isRetired !== dbIsRetired) {
                    award.isRetired = dbIsRetired;
                    updatedCount++;
                }
            }
        });
        
 // 변경된 경우에만 저장
        if (updatedCount > 0) {
            awardsManager.save();
            console.log(` 포상 데이터 재직/퇴사 상태 동기화: ${updatedCount}건 업데이트`);
        }
        
    } catch (error) {
        console.error(' 포상 재직/퇴사 상태 동기화 오류:', error);
    }
}

/**
 * 포상 현황 UI 렌더링
 * @private
 */
function _renderAwardsReportUI() {
    const totalCount = awardsManager.getAll().length;
    
    return `
        <div class="awards-report-container">
            <style>
                .awards-report-container {
                    max-width: 1600px;
                    margin: 0 auto;
                }
 /* 헤더 */
                .awards-report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 20px 24px;
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    border-radius: 14px;
                    color: white;
                    box-shadow: 0 4px 15px rgba(79, 70, 229, 0.25);
                }
                .awards-report-header h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .awards-report-header .count-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 5px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                    backdrop-filter: blur(10px);
                }
 /* 탭 */
                .report-tabs {
                    display: flex;
                    gap: 6px;
                    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                    padding: 10px 12px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    overflow-x: auto;
                    flex-wrap: wrap;
                    border: 1px solid #e2e8f0;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
                }
                .report-tab {
                    padding: 10px 18px;
                    border: 1px solid transparent;
                    background: transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #64748b;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                }
                .report-tab:hover {
                    background: white;
                    color: #475569;
                    border-color: #e2e8f0;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .report-tab.active {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                    font-weight: 600;
                    border-color: #4f46e5;
                    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
                    transform: translateY(-1px);
                }
                .report-tab .tab-icon {
                    font-size: 15px;
                }
 /* 기본 탭 강조 */
                .report-tab[data-tab="basic"] {
                    border-left: 3px solid #22c55e;
                    padding-left: 15px;
                }
                .report-tab[data-tab="basic"].active {
                    border-left-color: white;
                }
 /* 필터 영역 */
                .report-filters {
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    padding: 0;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    overflow: hidden;
                }
                .filter-section {
                    padding: 16px 20px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .filter-section:last-child {
                    border-bottom: none;
                }
                .filter-section-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #6366f1;
                    margin-bottom: 14px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .filter-row {
                    display: flex;
                    gap: 20px;
                    flex-wrap: wrap;
                    align-items: flex-end;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    min-width: 140px;
                }
                .filter-group label {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .filter-group select,
                .filter-group input[type="text"],
                .filter-group input[type="date"],
                .filter-group input[type="number"] {
                    padding: 10px 14px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 13px;
                    min-width: 140px;
                    background: white;
                    transition: all 0.2s;
                    color: #334155;
                    font-weight: 500;
                }
                .filter-group select:hover,
                .filter-group input:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }
                .filter-group select:focus,
                .filter-group input:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                    background: white;
                }
                .filter-group input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #6366f1;
                    cursor: pointer;
                }
                .filter-hint {
                    font-size: 10px;
                    color: #94a3b8;
                    margin-top: 4px;
                    font-style: italic;
                }
                .filter-actions {
                    display: flex;
                    gap: 12px;
                    padding: 16px 20px;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                }
                .filter-actions .btn {
                    padding: 10px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .filter-actions .btn-primary {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: white;
                    border: none;
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
                }
                .filter-actions .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                .filter-actions .btn-secondary {
                    background: white;
                    color: #64748b;
                    border: 2px solid #e2e8f0;
                }
                .filter-actions .btn-secondary:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                }
 /* 결과 영역 */
                .report-result-wrap {
                    max-height: 60vh;
                    overflow: scroll !important;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    position: relative;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                }
                .report-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 12px;
                    overflow: visible !important;
                }
                .report-table thead th {
                    position: -webkit-sticky;
                    position: sticky;
                    top: 0;
                    background: linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%);
                    color: #1e293b;
                    padding: 12px 10px;
                    text-align: center;
                    font-weight: 700;
                    white-space: nowrap;
                    z-index: 10;
                    border-bottom: 2px solid #a5b4fc;
                    font-size: 12px;
                    letter-spacing: -0.02em;
                }
                .report-table thead th:first-child {
                    border-radius: 10px 0 0 0;
                }
                .report-table thead th:last-child {
                    border-radius: 0 10px 0 0;
                }
                .report-table tbody td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #f3f4f6;
                    text-align: center;
                    background: white;
                    font-size: 12px;
                }
                .report-table tbody tr:hover td {
                    background: #f5f3ff;
                }
                .report-table tbody tr:nth-child(even) td {
                    background: #fafafa;
                }
                .report-table tbody tr:nth-child(even):hover td {
                    background: #f5f3ff;
                }
                .report-table td.text-left {
                    text-align: left;
                }
 /* 이전이력 셀 */
                .previous-history {
                    font-size: 11px;
                    color: #6b7280;
                    text-align: left;
                    max-width: 200px;
                }
 /* 상태 배지 */
                .status-selected {
                    color: #059669;
                    font-weight: 600;
                }
                .status-pending {
                    color: #2563eb;
                    font-weight: 600;
                }
                .status-not-selected {
                    color: #9ca3af;
                }
 /* 포상구분 배지 */
                .badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 11px;
                    font-weight: 500;
                }
                .badge-internal {
                    background: #e3f2fd;
                    color: #1565c0;
                }
                .badge-external {
                    background: #fff3e0;
                    color: #e65100;
                }
 /* 포상 표시 (연도별 컬럼) */
                .award-selected {
                    color: #111;
                    font-weight: 600;
                }
                .award-pending {
                    color: #2563eb;
                }
                .award-rejected {
                    color: #9ca3af;
                }
 /* 요약 */
                .report-summary {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-radius: 10px;
                    border: 1px solid #bbf7d0;
                }
                .report-summary h4 {
                    margin: 0;
                    font-size: 13px;
                    color: #166534;
                    font-weight: 600;
                }
                .report-actions {
                    display: flex;
                    gap: 8px;
                }
                .report-actions button {
                    padding: 7px 14px;
                    font-size: 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    border: 1px solid #d1d5db;
                    background: white;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .report-actions button:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                    transform: translateY(-1px);
                }
 /* 범례 */
                .report-legend {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 12px;
                    padding: 10px 16px;
                    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                    border-radius: 8px;
                    font-size: 12px;
                    border: 1px solid #fde68a;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                }
 /* 빈 상태 */
                .empty-state {
                    padding: 60px 20px;
                    text-align: center;
                    color: #6b7280;
                }
                .empty-state p {
                    margin: 0;
                }
 /* 로딩 */
                .loading {
                    padding: 40px;
                    text-align: center;
                    color: #6b7280;
                }
 /* 인쇄 시 - 기본 설정 (실제 인쇄는 printAwardsReport에서 동적 스타일 적용) */
                @media print {
                    .no-print,
                    .awards-report-header,
                    .report-tabs,
                    .report-filters,
                    .report-summary,
                    .report-legend,
                    .report-actions { 
                        display: none !important; 
                    }
                }
            </style>
            
            <!-- 헤더 -->
            <div class="awards-report-header no-print">
                <h2>
                    <span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span> 포상 현황
                    <span class="count-badge">총 ${totalCount}건</span>
                </h2>
            </div>
            
            ${totalCount === 0 ? `
            <div class="alert alert-info" style="margin-bottom: 16px;">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>포상 데이터가 없습니다. <strong>인력관리 → 포상 등록</strong> 또는 <strong>시스템 → 가져오기</strong>에서 데이터를 추가하세요.</span>
            </div>
            ` : ''}
            
            <!-- 보고서 탭 -->
            <div class="report-tabs no-print">
                ${Object.entries(REPORT_TABS).map(([key, tab]) => `
                    <button class="report-tab" data-tab="${key}" onclick="selectReportTab('${key}')">
                        ${tab.icon} ${tab.name}
                    </button>
                `).join('')}
            </div>
            
            <!-- 필터 영역 -->
            <div id="report-filters" class="report-filters no-print">
                <!-- 탭에 따라 동적 생성 -->
            </div>
            
            <!-- 결과 영역 -->
            <div id="report-result-area">
                <!-- 동적 생성 -->
            </div>
        </div>
    `;
}

// ===== 탭 선택 =====

/**
 * 보고서 탭 선택
 */
function selectReportTab(tabId) {
    currentReportTab = tabId;
    
 // 탭 활성화 상태 변경
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
 // 필터 UI 렌더링
    _renderFilterUI(tabId);
    
 // 기본 탭이면 바로 데이터 표시 (이미 _renderFilterUI에서 호출됨)
    if (tabId === 'basic') {
        return;
    }
    
 // 결과 초기화
    document.getElementById('report-result-area').innerHTML = `
        <div class="empty-state">
            <p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 필터를 설정하고 <strong>보고서 생성</strong> 버튼을 클릭하세요.</p>
        </div>
    `;
}

// ===== 필터 UI =====

/**
 * 필터 UI 렌더링
 * @private
 */
function _renderFilterUI(tabId) {
    const container = document.getElementById('report-filters');
    const years = awardsManager.getYears();
    const minYear = years.length > 0 ? Math.min(...years) : new Date().getFullYear() - 5;
    const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
    
 // 기본 탭은 별도 UI
    if (tabId === 'basic') {
        container.innerHTML = _renderBasicFilterUI(years);
 // 기본 탭은 바로 데이터 표시
        _loadBasicReport();
        return;
    }
    
 // 포상사진 출력은 별도 UI
    if (tabId === 'photo-print') {
        container.innerHTML = _renderPhotoFilterUI(minYear, maxYear);
        return;
    }
    
 // 공통 필터 + 보고서별 추가 필터
    let advancedFilterHtml = '';
    
 // 직원별 포상내역만 상세 필터 제공
    if (tabId === 'employee-awards') {
        advancedFilterHtml = `
            <div class="filter-section">
                <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 상세 필터</div>
                <div class="filter-row">
                    <div class="filter-group">
                        <label>직원 검색</label>
                        <input type="text" id="filter-employee-name" placeholder="이름 입력..." />
                        <span class="filter-hint">부분 일치 검색</span>
                    </div>
                    <div class="filter-group">
                        <label>포상구분</label>
                        <select id="filter-award-type">
                            <option value="">전체</option>
                            <option value="외부">외부</option>
                            <option value="내부">내부</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>선정여부</label>
                        <select id="filter-selection-status">
                            <option value="">전체</option>
                            <option value="선정">선정</option>
                            <option value="미선정">미선정</option>
                            <option value="미발표">미발표</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
 // 직원별 외부포상에만 선정여부 체크박스 필터 추가
    let statusFilterHtml = '';
    if (tabId === 'employee-external') {
        statusFilterHtml = `
            <div class="filter-group">
                <label>선정여부 (복수 선택 가능)</label>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-weight: normal;">
                        <input type="checkbox" id="filter-status-selected" checked 
                               style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #111; font-size: 13px;">선정</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-weight: normal;">
                        <input type="checkbox" id="filter-status-pending" 
                               style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #2563eb; font-size: 13px;">미발표</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-weight: normal;">
                        <input type="checkbox" id="filter-status-rejected" 
                               style="width: 16px; height: 16px; cursor: pointer;">
                        <span style="color: #9ca3af; font-size: 13px;">미선정</span>
                    </label>
                </div>
                <span class="filter-hint">선택한 상태만 표시됩니다</span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <!-- 기본 필터 -->
        <div class="filter-section">
            <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 기본 필터</div>
            <div class="filter-row">
                <div class="filter-group">
                    <label>직원 구분</label>
                    <select id="filter-employee-status">
                        <option value="all">전체 직원</option>
                        <option value="active" selected>재직자만</option>
                        <option value="retired">퇴사자만</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>연도 범위</label>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <select id="filter-year-start">
                            ${_generateAwardYearOptions(minYear, maxYear, minYear)}
                        </select>
                        <span>~</span>
                        <select id="filter-year-end">
                            ${_generateAwardYearOptions(minYear, maxYear, maxYear)}
                        </select>
                    </div>
                    <span class="filter-hint">범위 이전 포상(선정)은 '이전이력'에 표시</span>
                </div>
                <div class="filter-group">
                    <label style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="filter-date-active" onchange="toggleReferenceDateInput()" />
                        특정일 기준 재직자
                    </label>
                    <input type="date" id="filter-reference-date" 
                           value="${new Date().toISOString().split('T')[0]}" disabled />
                    <span class="filter-hint">체크 시: 포상 없는 직원도 표시</span>
                </div>
                ${statusFilterHtml}
            </div>
        </div>
        
        ${advancedFilterHtml}
        
        <!-- 버튼 -->
        <div class="filter-actions">
            <button class="btn btn-primary" onclick="generateReport()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 보고서 생성
            </button>
            <button class="btn btn-secondary" onclick="resetFilters()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> 필터 초기화
            </button>
        </div>
    `;
}

/**
 * 기본 탭 필터 UI (기존 포상 현황 스타일)
 */
function _renderBasicFilterUI(years) {
    return `
        <div class="filter-section">
            <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 검색 필터</div>
            <div class="filter-row">
                <div class="filter-group">
                    <label>정렬 기준</label>
                    <select id="basic-sort-by" onchange="_loadBasicReport()">
                        <option value="date-desc">수상일 (최신순)</option>
                        <option value="date-asc">수상일 (오래된순)</option>
                        <option value="name">직원별 (이름순)</option>
                        <option value="year">연도별</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>포상구분</label>
                    <select id="basic-filter-type" onchange="_loadBasicReport()">
                        <option value="전체">전체</option>
                        <option value="내부">내부</option>
                        <option value="외부">외부</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>선정여부</label>
                    <select id="basic-filter-status" onchange="_loadBasicReport()">
                        <option value="전체">전체</option>
                        <option value="선정">선정</option>
                        <option value="미선정">미선정</option>
                        <option value="미발표">미발표</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>포상년도</label>
                    <select id="basic-filter-year" onchange="_loadBasicReport()">
                        <option value="">전체</option>
                        ${years.map(y => `<option value="${y}">${y}년</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label>재직여부</label>
                    <select id="basic-filter-employment" onchange="_loadBasicReport()">
                        <option value="전체">전체</option>
                        <option value="재직">재직자만</option>
                        <option value="퇴사">퇴사자만</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="filter-section">
            <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 기간 검색</div>
            <div class="filter-row">
                <div class="filter-group">
                    <label>수상일 (시작)</label>
                    <input type="date" id="basic-filter-start" onchange="_loadBasicReport()" />
                </div>
                <div class="filter-group">
                    <label>수상일 (종료)</label>
                    <input type="date" id="basic-filter-end" onchange="_loadBasicReport()" />
                </div>
            </div>
        </div>
        <div class="filter-actions">
            <button class="btn btn-secondary" onclick="_resetBasicFilters()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> 필터 초기화
            </button>
        </div>
    `;
}

/**
 * 기본 필터 초기화
 */
function _resetBasicFilters() {
    document.getElementById('basic-sort-by').value = 'date-desc';
    document.getElementById('basic-filter-type').value = '전체';
    document.getElementById('basic-filter-status').value = '전체';
    document.getElementById('basic-filter-year').value = '';
    document.getElementById('basic-filter-employment').value = '전체';
    document.getElementById('basic-filter-start').value = '';
    document.getElementById('basic-filter-end').value = '';
    _loadBasicReport();
}

/**
 * 기본 보고서 로드
 */
function _loadBasicReport() {
    const sortBy = document.getElementById('basic-sort-by')?.value || 'date-desc';
    const typeFilter = document.getElementById('basic-filter-type')?.value || '전체';
    const statusFilter = document.getElementById('basic-filter-status')?.value || '전체';
    const yearFilter = document.getElementById('basic-filter-year')?.value || '';
    const employmentFilter = document.getElementById('basic-filter-employment')?.value || '전체';
    const startDate = document.getElementById('basic-filter-start')?.value || '';
    const endDate = document.getElementById('basic-filter-end')?.value || '';
    
    let awards = awardsManager.getAll();
    
 // 필터 적용
    if (typeFilter !== '전체') {
        awards = awards.filter(a => a.type === typeFilter);
    }
    if (statusFilter !== '전체') {
        awards = awards.filter(a => a.status === statusFilter);
    }
    if (yearFilter) {
        awards = awards.filter(a => String(a.year) === yearFilter);
    }
    if (employmentFilter !== '전체') {
        if (employmentFilter === '재직') {
            awards = awards.filter(a => !a.isRetired);
        } else {
            awards = awards.filter(a => a.isRetired);
        }
    }
    if (startDate) {
        awards = awards.filter(a => {
            const date = _formatDate(a.awardDate);
            return date >= startDate;
        });
    }
    if (endDate) {
        awards = awards.filter(a => {
            const date = _formatDate(a.awardDate);
            return date && date <= endDate;
        });
    }
    
 // 정렬
    switch (sortBy) {
        case 'date-desc':
            awards.sort((a, b) => (_formatDate(b.awardDate) || '').localeCompare(_formatDate(a.awardDate) || ''));
            break;
        case 'date-asc':
            awards.sort((a, b) => (_formatDate(a.awardDate) || '9999').localeCompare(_formatDate(b.awardDate) || '9999'));
            break;
        case 'name':
            awards.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'year':
            awards.sort((a, b) => parseInt(a.year) - parseInt(b.year));
            break;
    }
    
 // 통계 계산
    const total = awards.length;
    const selected = awards.filter(a => a.status === '선정').length;
    const notSelected = awards.filter(a => a.status === '미선정').length;
    const pending = awards.filter(a => a.status === '미발표').length;
    const internal = awards.filter(a => a.type === '내부').length;
    const external = awards.filter(a => a.type === '외부').length;
    
    const container = document.getElementById('report-result-area');
    
    if (awards.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 포상 데이터가 없습니다.</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>검색 결과: ${total}건 | 선정 ${selected} / 미선정 ${notSelected} / 미발표 ${pending} | 내부 ${internal} / 외부 ${external}</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('basic')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>포상구분</th>
                        <th>성명</th>
                        <th>직위</th>
                        <th>재직</th>
                        <th>포상년도</th>
                        <th>수상년월일</th>
                        <th>포상내역</th>
                        <th>훈격</th>
                        <th>포상주관처</th>
                        <th>선정여부</th>
                    </tr>
                </thead>
                <tbody>
                    ${awards.map((a, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><span class="badge ${a.type === '내부' ? 'badge-internal' : 'badge-external'}">${a.type || ''}</span></td>
                            <td>${a.name || ''}</td>
                            <td>${a.position || ''}</td>
                            <td>${a.isRetired ? '퇴사' : '재직'}</td>
                            <td>${a.year || ''}</td>
                            <td>${_formatDate(a.awardDate) || ''}</td>
                            <td class="text-left">${a.awardName || ''}</td>
                            <td>${a.honor || ''}</td>
                            <td>${a.organization || ''}</td>
                            <td><span class="${a.status === '선정' ? 'status-selected' : a.status === '미발표' ? 'status-pending' : 'status-not-selected'}">${a.status || ''}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 포상사진 출력 필터 UI
 */
function _renderPhotoFilterUI(minYear, maxYear) {
    const lastFolder = localStorage.getItem('awardPhoto_lastFolder') || '';
    const lastFolderMsg = lastFolder ? 
        `<span style="color:#10b981;">✓ 마지막 폴더: ${lastFolder} (다시 선택 필요)</span>` : 
        `<span style="color:#9ca3af;">폴더를 선택하세요</span>`;
    
    return `
        <div class="filter-section">
            <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> 포상사진 출력 (선정된 외부 포상)</div>
            <p style="color: #64748b; margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
                선정된 외부 포상의 <strong>성명</strong>과 <strong>수상일</strong>을 기준으로 상장사진을 자동 매칭하여 출력합니다.
            </p>
            
            <div class="filter-row">
                <div class="filter-group">
                    <label>시작 년도</label>
                    <input type="number" id="photo-start-year" value="${maxYear - 5}" min="2000" max="${maxYear}" />
                </div>
                <div class="filter-group">
                    <label>종료 년도</label>
                    <input type="number" id="photo-end-year" value="${maxYear}" min="2000" max="${maxYear}" />
                </div>
                <div class="filter-group">
                    <label>직원 검색 (퇴사자 포함)</label>
                    <input type="text" id="photo-employee-search" placeholder="이름 입력..." 
                           style="width: 150px;" />
                    <span class="filter-hint">부분 일치 검색, 비워두면 전체</span>
                </div>
            </div>
        </div>
        
        <div class="filter-section">
            <div class="filter-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> 사진 폴더 선택</div>
            <div class="photo-folder-selector" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <input type="file" id="award-photo-folder" 
                       webkitdirectory multiple 
                       onchange="handleAwardPhotoFolderSelect(this.files)"
                       style="display:none;">
                <button type="button" class="btn btn-secondary" style="padding:10px 16px;"
                        onclick="document.getElementById('award-photo-folder').click()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> 폴더 선택...
                </button>
                <span id="award-photo-status" class="photo-status" style="font-size:13px;">
                    ${lastFolderMsg}
                </span>
            </div>
            <p style="color:#94a3b8; font-size:11px; margin-top:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> 상장/수상 사진이 있는 폴더를 선택하면 자동으로 매칭됩니다. (페이지 새로고침 시 재선택 필요)
            </p>
        </div>
        
        <div class="filter-section" style="background:#f0fdf4; margin:-1px -20px -1px; padding:16px 20px; border-radius:0 0 12px 12px;">
            <div style="font-weight:600; color:#166534; margin-bottom:10px; font-size:13px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 인식 가능한 파일명 형식</div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:8px;">
                <div style="background:white; padding:8px 12px; border-radius:6px; border:1px solid #bbf7d0;">
                    <code style="font-size:12px; color:#15803d;">홍길동(2024.10.15).jpg</code>
                    <span style="font-size:10px; color:#6b7280; display:block; margin-top:2px;">점 구분 (권장)</span>
                </div>
                <div style="background:white; padding:8px 12px; border-radius:6px; border:1px solid #bbf7d0;">
                    <code style="font-size:12px; color:#15803d;">홍길동(2024-10-15).jpg</code>
                    <span style="font-size:10px; color:#6b7280; display:block; margin-top:2px;">하이픈 구분</span>
                </div>
                <div style="background:white; padding:8px 12px; border-radius:6px; border:1px solid #bbf7d0;">
                    <code style="font-size:12px; color:#15803d;">홍길동(2024.9.5).png</code>
                    <span style="font-size:10px; color:#6b7280; display:block; margin-top:2px;">0 없이</span>
                </div>
                <div style="background:white; padding:8px 12px; border-radius:6px; border:1px solid #bbf7d0;">
                    <code style="font-size:12px; color:#15803d;">홍길동_2024.10.15.jpg</code>
                    <span style="font-size:10px; color:#6b7280; display:block; margin-top:2px;">언더스코어</span>
                </div>
            </div>
            <p style="color:#15803d; font-size:11px; margin-top:10px;">
                ✓ jpg, jpeg, png, gif, webp 확장자 지원 | ✓ 대소문자 구분 없음
            </p>
        </div>
        
        <div class="filter-actions">
            <button class="btn btn-primary" onclick="showPhotosList()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 대상 목록 보기
            </button>
            <button class="btn btn-secondary" onclick="printPhotos()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> 사진 출력 미리보기
            </button>
        </div>
    `;
}

/**
 * 연도 옵션 생성
 */
function _generateAwardYearOptions(minYear, maxYear, selected) {
    let options = '';
    for (let year = minYear; year <= maxYear; year++) {
        options += `<option value="${year}" ${year === selected ? 'selected' : ''}>${year}</option>`;
    }
    return options;
}

/**
 * 기준일 입력 토글
 */
function toggleReferenceDateInput() {
    const checkbox = document.getElementById('filter-date-active');
    const dateInput = document.getElementById('filter-reference-date');
    dateInput.disabled = !checkbox.checked;
}

/**
 * 필터 초기화
 */
function resetFilters() {
    const dateActive = document.getElementById('filter-date-active');
    const refDate = document.getElementById('filter-reference-date');
    const empStatus = document.getElementById('filter-employee-status');
    
    if (empStatus) empStatus.value = 'active';
    if (dateActive) {
        dateActive.checked = false;
        refDate.disabled = true;
        refDate.value = new Date().toISOString().split('T')[0];
    }
    
 // 연도 초기화
    const years = awardsManager.getYears();
    if (years.length > 0) {
        const yearStart = document.getElementById('filter-year-start');
        const yearEnd = document.getElementById('filter-year-end');
        if (yearStart) yearStart.value = Math.min(...years);
        if (yearEnd) yearEnd.value = Math.max(...years);
    }
    
 // 상세 필터 초기화
    const empName = document.getElementById('filter-employee-name');
    const awardType = document.getElementById('filter-award-type');
    const selStatus = document.getElementById('filter-selection-status');
    if (empName) empName.value = '';
    if (awardType) awardType.value = '';
    if (selStatus) selStatus.value = '';
}

// ===== 보고서 생성 =====

/**
 * 보고서 생성 메인 함수
 */
function generateReport() {
    const resultArea = document.getElementById('report-result-area');
    
 // 필터 값 수집
    const filters = _collectFilters();
    
 // 로딩 표시
    resultArea.innerHTML = '<div class="loading"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 보고서 생성 중...</div>';
    
 // 약간의 지연 후 보고서 생성
    setTimeout(() => {
        switch(currentReportTab) {
            case 'employee-awards':
                _generateEmployeeAwardsReport(resultArea, filters);
                break;
            case 'employee-external':
                _generateEmployeeExternalReport(resultArea, filters);
                break;
            case 'employee-internal':
                _generateEmployeeInternalReport(resultArea, filters);
                break;
            case 'yearly-awards':
                _generateYearlyAwardsReport(resultArea, filters);
                break;
            case 'internal-selected':
                _generateInternalSelectedReport(resultArea, filters);
                break;
            case 'external-selected':
                _generateExternalSelectedReport(resultArea, filters);
                break;
        }
    }, 200);
}

/**
 * 필터 값 수집
 */
function _collectFilters() {
 // 선정여부 체크박스 (직원별 외부/내부 포상용)
    const statusSelected = document.getElementById('filter-status-selected')?.checked ?? true;
    const statusPending = document.getElementById('filter-status-pending')?.checked ?? false;
    const statusRejected = document.getElementById('filter-status-rejected')?.checked ?? false;
    
 // 선택된 상태 배열 생성
    const selectedStatuses = [];
    if (statusSelected) selectedStatuses.push('선정');
    if (statusPending) selectedStatuses.push('미발표');
    if (statusRejected) selectedStatuses.push('미선정');
    
    return {
        employeeStatus: document.getElementById('filter-employee-status')?.value || 'all',
        yearStart: parseInt(document.getElementById('filter-year-start')?.value) || 2020,
        yearEnd: parseInt(document.getElementById('filter-year-end')?.value) || new Date().getFullYear(),
        dateActive: document.getElementById('filter-date-active')?.checked || false,
        referenceDate: document.getElementById('filter-reference-date')?.value || '',
        employeeName: document.getElementById('filter-employee-name')?.value?.trim() || '',
        awardType: document.getElementById('filter-award-type')?.value || '',
        selectionStatus: document.getElementById('filter-selection-status')?.value || '',
 // 직원별 외부/내부 포상용 선정여부 배열
        selectedStatuses: selectedStatuses
    };
}

// ===== 공통 유틸리티 =====

/**
 * 날짜 형식 통일 (YYYY-MM-DD)
 */
function _formatDate(dateStr) {
    if (!dateStr) return '';
    
 // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
 // 먼저 공백 제거 및 정리
    let cleaned = String(dateStr).trim();
    
 // 공백 제거 (2022. 12. 6. → 2022.12.6)
    cleaned = cleaned.replace(/\s+/g, '');
    
 // 마지막 점 제거 (2022.12.6. → 2022.12.6)
    cleaned = cleaned.replace(/\.+$/, '');
    
 // 점 구분자
    if (cleaned.includes('.')) {
        const parts = cleaned.split('.').filter(p => p); // 빈 문자열 제거
        if (parts.length >= 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
 // 슬래시 구분자
    if (cleaned.includes('/')) {
        const parts = cleaned.split('/').filter(p => p);
        if (parts.length >= 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
 // 하이픈 구분자 (이미 하이픈이지만 형식이 다른 경우)
    if (cleaned.includes('-')) {
        const parts = cleaned.split('-').filter(p => p);
        if (parts.length >= 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
    return dateStr;
}

/**
 * 수상일 표시 (선정/미발표/미선정)
 */
function _getAwardDateDisplay(award) {
    if (award.status === '선정') {
        return _formatDate(award.awardDate);
    } else if (award.status === '미발표') {
        return '미발표';
    } else {
        return '미선정';
    }
}

/**
 * 이전이력 생성 (연도 범위 이전 선정 포상)
 */
function _generatePreviousHistory(awards, yearStart) {
    const previous = awards.filter(a => 
        parseInt(a.year) < yearStart && a.status === '선정'
    );
    
    if (previous.length === 0) return '-';
    
    previous.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    
    return previous.map(a => {
        const yearShort = String(a.year).slice(-2);
        return `'${yearShort}${a.honor || ''}`;
    }).join(', ');
}

/**
 * 필터 적용 (포상 데이터)
 */
function _applyAwardFilters(awards, filters) {
    return awards.filter(award => {
 // 연도 범위
        const year = parseInt(award.year);
        if (year < filters.yearStart || year > filters.yearEnd) return false;
        
 // 직원 재직 여부 (기준일이 아닐 때)
        if (!filters.dateActive) {
            if (filters.employeeStatus === 'active' && award.isRetired) return false;
            if (filters.employeeStatus === 'retired' && !award.isRetired) return false;
        }
        
        return true;
    });
}

/**
 * 기준일 재직 직원 목록 (DB에서)
 */
function _getEmployeesOnReferenceDate(referenceDate) {
    const refDate = new Date(referenceDate);
    const employees = typeof db !== 'undefined' ? db.getEmployees() : [];
    
    return employees.filter(emp => {
 // 입사일: employment.entryDate
        const hireDate = emp.employment?.entryDate ? new Date(emp.employment.entryDate) : null;
 // 퇴사일: employment.retirementDate
        const retireDate = emp.employment?.retirementDate ? new Date(emp.employment.retirementDate) : null;
        
 // 입사일이 기준일 이후면 제외
        if (hireDate && hireDate > refDate) return false;
 // 퇴사일이 기준일 이전이면 제외
        if (retireDate && retireDate < refDate) return false;
        
        return true;
    });
}

// ===== 1. 직원별 포상내역 =====

function _generateEmployeeAwardsReport(container, filters) {
    let awards = awardsManager.getAll();
    
 // 필터 적용
    awards = _applyAwardFilters(awards, filters);
    
 // 직원명 검색
    if (filters.employeeName) {
        awards = awards.filter(a => a.name?.includes(filters.employeeName));
    }
    
 // 포상구분
    if (filters.awardType) {
        awards = awards.filter(a => a.type === filters.awardType);
    }
    
 // 선정여부
    if (filters.selectionStatus) {
        awards = awards.filter(a => a.status === filters.selectionStatus);
    }
    
    if (awards.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 포상 데이터가 없습니다.</p></div>';
        return;
    }
    
 // 정렬: 재직자 우선 → 이름순
    awards.sort((a, b) => {
        if (a.isRetired !== b.isRetired) return a.isRetired ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '');
    });
    
    let filterSummary = '';
    if (filters.employeeName) filterSummary += ` | 검색: ${filters.employeeName}`;
    if (filters.awardType) filterSummary += ` | ${filters.awardType}`;
    if (filters.selectionStatus) filterSummary += ` | ${filters.selectionStatus}`;
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>총 ${awards.length}건${filterSummary}</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('employee-awards')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th>성명</th>
                        <th>재직여부</th>
                        <th>포상구분</th>
                        <th>포상년도</th>
                        <th>포상내역</th>
                        <th>훈격</th>
                        <th>포상주관처</th>
                        <th>선정여부</th>
                        <th>수상일</th>
                    </tr>
                </thead>
                <tbody>
                    ${awards.map(a => `
                        <tr>
                            <td>${a.name || ''}</td>
                            <td>${a.isRetired ? '퇴사' : '재직'}</td>
                            <td>${a.type || ''}</td>
                            <td>${a.year || ''}</td>
                            <td class="text-left">${a.awardName || ''}</td>
                            <td>${a.honor || ''}</td>
                            <td>${a.organization || ''}</td>
                            <td><span class="${a.status === '선정' ? 'status-selected' : a.status === '미발표' ? 'status-pending' : 'status-not-selected'}">${a.status || ''}</span></td>
                            <td>${_getAwardDateDisplay(a)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 2. 직원별 외부포상 =====

function _generateEmployeeExternalReport(container, filters) {
    const allAwards = awardsManager.getAll().filter(a => a.type === '외부');
    let awards = _applyAwardFilters(allAwards, filters);
    
 // 선정여부 필터 적용 (체크박스)
    if (filters.selectedStatuses && filters.selectedStatuses.length > 0) {
        awards = awards.filter(a => filters.selectedStatuses.includes(a.status));
    }
    
 // 직원별 그룹화
    let employees;
    
    if (filters.dateActive) {
 // 기준일 재직자 전체
        const allEmps = _getEmployeesOnReferenceDate(filters.referenceDate);
        const employeeMap = new Map();
        
        allEmps.forEach(emp => {
 // 이름: personalInfo.name 또는 name
            const empName = emp.personalInfo?.name || emp.name;
            if (!empName) return;
            
            employeeMap.set(empName, {
                name: empName,
                hireDate: emp.employment?.entryDate,
                isRetired: !!(emp.employment?.retirementDate),
                awards: [],
                allAwards: []
            });
        });
        
 // 포상 매칭 (이름 기준) - 필터된 awards만
        allAwards.forEach(award => {
            if (award.name && employeeMap.has(award.name)) {
                employeeMap.get(award.name).allAwards.push(award);
            }
        });
        awards.forEach(award => {
            if (award.name && employeeMap.has(award.name)) {
                employeeMap.get(award.name).awards.push(award);
            }
        });
        
        employees = Array.from(employeeMap.values());
    } else {
        if (awards.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 외부 포상 데이터가 없습니다.</p></div>';
            return;
        }
        
        const employeeMap = new Map();
        const uniqueNames = [...new Set(awards.map(a => a.name))];
        
        uniqueNames.forEach(name => {
            const empAwards = awards.filter(a => a.name === name);
            const empAllAwards = allAwards.filter(a => a.name === name);
            const firstAward = empAwards[0];
            
            employeeMap.set(name, {
                name,
                hireDate: firstAward.entryDate,
                isRetired: firstAward.isRetired,
                awards: empAwards,
                allAwards: empAllAwards
            });
        });
        
        employees = Array.from(employeeMap.values());
    }
    
 // 입사일순 정렬
    employees.sort((a, b) => {
        const dateA = a.hireDate ? new Date(a.hireDate) : new Date('9999-12-31');
        const dateB = b.hireDate ? new Date(b.hireDate) : new Date('9999-12-31');
        return dateA - dateB;
    });
    
 // 연도 컬럼
    const years = [];
    for (let y = filters.yearStart; y <= filters.yearEnd; y++) years.push(y);
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>직원 ${employees.length}명 | 포상 ${awards.length}건</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('employee-external')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-legend no-print">
            <span class="legend-item"><strong style="color:#111;">■</strong> 선정</span>
            <span class="legend-item"><span style="color:#2563eb;">■</span> 미발표</span>
            <span class="legend-item"><span style="color:#9ca3af;">■</span> 미선정</span>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th style="min-width:70px;">성명</th>
                        <th style="min-width:90px;">입사일</th>
                        <th style="min-width:60px;">재직</th>
                        <th style="min-width:150px;">이전이력<br><small>(선정)</small></th>
                        ${years.map(y => `<th style="min-width:180px;">${y}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => {
                        const prevHistory = _generatePreviousHistory(emp.allAwards || [], filters.yearStart);
                        return `
                            <tr>
                                <td>${emp.name}</td>
                                <td>${_formatDate(emp.hireDate) || '-'}</td>
                                <td>${emp.isRetired ? '퇴사' : '재직'}</td>
                                <td class="previous-history">${prevHistory}</td>
                                ${years.map(y => {
                                    const yearAwards = (emp.awards || []).filter(a => parseInt(a.year) === y);
                                    if (yearAwards.length === 0) return '<td>-</td>';
                                    
                                    const html = yearAwards.map(a => {
                                        const prefix = a.status === '선정' ? '[선정]' : a.status === '미발표' ? '[미발표]' : '[미선정]';
                                        const cls = a.status === '선정' ? 'award-selected' : a.status === '미발표' ? 'award-pending' : 'award-rejected';
                                        return `<span class="${cls}">${prefix} ${a.organization || ''}_${a.awardName || ''}_${a.honor || ''}</span>`;
                                    }).join('<br>');
                                    
                                    return `<td class="text-left">${html}</td>`;
                                }).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 3. 직원별 내부포상 =====

function _generateEmployeeInternalReport(container, filters) {
    const allAwards = awardsManager.getAll().filter(a => a.type === '내부');
    let awards = _applyAwardFilters(allAwards, filters);
    
 // 직원별 그룹화 (외부와 동일 로직)
    let employees;
    
    if (filters.dateActive) {
        const allEmps = _getEmployeesOnReferenceDate(filters.referenceDate);
        const employeeMap = new Map();
        
        allEmps.forEach(emp => {
 // 이름: personalInfo.name 또는 name
            const empName = emp.personalInfo?.name || emp.name;
            if (!empName) return;
            
            employeeMap.set(empName, {
                name: empName,
                hireDate: emp.employment?.entryDate,
                isRetired: !!(emp.employment?.retirementDate),
                awards: [],
                allAwards: []
            });
        });
        
 // 포상 매칭 (이름 기준) - 필터된 awards만
        allAwards.forEach(award => {
            if (award.name && employeeMap.has(award.name)) {
                employeeMap.get(award.name).allAwards.push(award);
            }
        });
        awards.forEach(award => {
            if (award.name && employeeMap.has(award.name)) {
                employeeMap.get(award.name).awards.push(award);
            }
        });
        
        employees = Array.from(employeeMap.values());
    } else {
        if (awards.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 내부 포상 데이터가 없습니다.</p></div>';
            return;
        }
        
        const employeeMap = new Map();
        const uniqueNames = [...new Set(awards.map(a => a.name))];
        
        uniqueNames.forEach(name => {
            const empAwards = awards.filter(a => a.name === name);
            const empAllAwards = allAwards.filter(a => a.name === name);
            const firstAward = empAwards[0];
            
            employeeMap.set(name, {
                name,
                hireDate: firstAward.entryDate,
                isRetired: firstAward.isRetired,
                awards: empAwards,
                allAwards: empAllAwards
            });
        });
        
        employees = Array.from(employeeMap.values());
    }
    
    employees.sort((a, b) => {
        const dateA = a.hireDate ? new Date(a.hireDate) : new Date('9999-12-31');
        const dateB = b.hireDate ? new Date(b.hireDate) : new Date('9999-12-31');
        return dateA - dateB;
    });
    
    const years = [];
    for (let y = filters.yearStart; y <= filters.yearEnd; y++) years.push(y);
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>직원 ${employees.length}명 | 포상 ${awards.length}건</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('employee-internal')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th style="min-width:70px;">성명</th>
                        <th style="min-width:90px;">입사일</th>
                        <th style="min-width:60px;">재직</th>
                        <th style="min-width:150px;">이전이력<br><small>(선정)</small></th>
                        ${years.map(y => `<th style="min-width:180px;">${y}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${employees.map(emp => {
                        const prevHistory = _generatePreviousHistory(emp.allAwards || [], filters.yearStart);
                        return `
                            <tr>
                                <td>${emp.name}</td>
                                <td>${_formatDate(emp.hireDate) || '-'}</td>
                                <td>${emp.isRetired ? '퇴사' : '재직'}</td>
                                <td class="previous-history">${prevHistory}</td>
                                ${years.map(y => {
                                    const yearAwards = (emp.awards || []).filter(a => parseInt(a.year) === y);
                                    if (yearAwards.length === 0) return '<td>-</td>';
                                    
                                    const html = yearAwards.map(a => {
                                        return `${a.awardName || ''}_${a.organization || ''}_${a.honor || ''}`;
                                    }).join('<br>');
                                    
                                    return `<td class="text-left">${html}</td>`;
                                }).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 4. 연도별 포상내역 =====

function _generateYearlyAwardsReport(container, filters) {
    let awards = awardsManager.getAll();
    awards = _applyAwardFilters(awards, filters);
    
    if (awards.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 포상 데이터가 없습니다.</p></div>';
        return;
    }
    
 // 연도순 → 수상일순
    awards.sort((a, b) => {
        if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
        const dateA = a.status === '선정' ? a.awardDate : '9999-12-31';
        const dateB = b.status === '선정' ? b.awardDate : '9999-12-31';
        return dateA.localeCompare(dateB);
    });
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>총 ${awards.length}건</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('yearly-awards')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th>포상년도</th>
                        <th>성명</th>
                        <th>포상구분</th>
                        <th>포상내역</th>
                        <th>훈격</th>
                        <th>선정여부</th>
                        <th>수상일</th>
                    </tr>
                </thead>
                <tbody>
                    ${awards.map(a => `
                        <tr>
                            <td>${a.year || ''}</td>
                            <td>${a.name || ''}</td>
                            <td>${a.type || ''}</td>
                            <td class="text-left">${a.awardName || ''}</td>
                            <td>${a.honor || ''}</td>
                            <td><span class="${a.status === '선정' ? 'status-selected' : a.status === '미발표' ? 'status-pending' : 'status-not-selected'}">${a.status || ''}</span></td>
                            <td>${_getAwardDateDisplay(a)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 5. 내부포상(선정) =====

function _generateInternalSelectedReport(container, filters) {
    let awards = awardsManager.getAll()
        .filter(a => a.type === '내부' && a.status === '선정');
    
    awards = _applyAwardFilters(awards, filters);
    
 // 기준일 재직자 필터
    if (filters.dateActive) {
        const activeEmps = _getEmployeesOnReferenceDate(filters.referenceDate);
 // 이름: personalInfo.name 또는 name
        const activeNames = new Set(activeEmps.map(e => e.personalInfo?.name || e.name));
        
        awards = awards.filter(a => {
 // 이름 기준으로 매칭
            if (a.name && activeNames.has(a.name)) return true;
            return false;
        });
    }
    
    if (awards.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 선정된 내부 포상이 없습니다.</p></div>';
        return;
    }
    
 // 재직자 우선 → 수상일순
    awards.sort((a, b) => {
        if (a.isRetired !== b.isRetired) return a.isRetired ? 1 : -1;
        return (a.awardDate || '').localeCompare(b.awardDate || '');
    });
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>${awards.length}건</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('internal-selected')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th>성명</th>
                        <th>재직여부</th>
                        <th>포상년도</th>
                        <th>포상내역</th>
                        <th>훈격</th>
                        <th>포상내용</th>
                        <th>수상일</th>
                    </tr>
                </thead>
                <tbody>
                    ${awards.map(a => `
                        <tr>
                            <td>${a.name || ''}</td>
                            <td>${a.isRetired ? '퇴사' : '재직'}</td>
                            <td>${a.year || ''}</td>
                            <td class="text-left">${a.awardName || ''}</td>
                            <td>${a.honor || ''}</td>
                            <td class="text-left">${a.content || ''}</td>
                            <td>${_formatDate(a.awardDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 6. 외부포상(선정) =====

function _generateExternalSelectedReport(container, filters) {
    let awards = awardsManager.getAll()
        .filter(a => a.type === '외부' && a.status === '선정');
    
    awards = _applyAwardFilters(awards, filters);
    
 // 기준일 재직자 필터
    if (filters.dateActive) {
        const activeEmps = _getEmployeesOnReferenceDate(filters.referenceDate);
 // 이름: personalInfo.name 또는 name
        const activeNames = new Set(activeEmps.map(e => e.personalInfo?.name || e.name));
        
        awards = awards.filter(a => {
 // 이름 기준으로 매칭
            if (a.name && activeNames.has(a.name)) return true;
            return false;
        });
    }
    
    if (awards.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>필터 조건에 맞는 선정된 외부 포상이 없습니다.</p></div>';
        return;
    }
    
    awards.sort((a, b) => {
        if (a.isRetired !== b.isRetired) return a.isRetired ? 1 : -1;
        return (a.awardDate || '').localeCompare(b.awardDate || '');
    });
    
    container.innerHTML = `
        <div class="report-summary">
            <h4>${awards.length}건</h4>
            <div class="report-actions">
                <button onclick="exportReportToExcel('external-selected')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀</button>
                <button onclick="printAwardsReport()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table" id="report-table">
                <thead>
                    <tr>
                        <th>성명</th>
                        <th>재직여부</th>
                        <th>포상년도</th>
                        <th>포상내역</th>
                        <th>훈격</th>
                        <th>포상주관처</th>
                        <th>수상일</th>
                    </tr>
                </thead>
                <tbody>
                    ${awards.map(a => `
                        <tr>
                            <td>${a.name || ''}</td>
                            <td>${a.isRetired ? '퇴사' : '재직'}</td>
                            <td>${a.year || ''}</td>
                            <td class="text-left">${a.awardName || ''}</td>
                            <td>${a.honor || ''}</td>
                            <td>${a.organization || ''}</td>
                            <td>${_formatDate(a.awardDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== 7. 포상사진 출력 =====

// 포상사진 맵 (성명+날짜 → Blob URL)
let _awardPhotoMap = new Map();

/**
 * 포상사진 폴더 선택 핸들러
 */
async function handleAwardPhotoFolderSelect(files) {
    if (!files || files.length === 0) return;
    
    const statusEl = document.getElementById('award-photo-status');
    if (statusEl) {
        statusEl.innerHTML = `<span style="color:#6b7280;">⏳ 사진 로딩 중...</span>`;
    }
    
    try {
        _awardPhotoMap.clear();
        let matchedCount = 0;
        let folderPath = '';
        
        for (const file of files) {
 // 이미지 파일만 처리
            if (!file.type.startsWith('image/')) continue;
            
 // 폴더 경로 저장 (첫 번째 파일에서)
            if (!folderPath && file.webkitRelativePath) {
                folderPath = file.webkitRelativePath.split('/')[0];
            }
            
 // 파일명 그대로 저장 (확장자 포함)
            const fileName = file.name;
            
 // Blob URL 생성
            const blobUrl = URL.createObjectURL(file);
            _awardPhotoMap.set(fileName, blobUrl);
            matchedCount++;
            
 // 진행 상황 업데이트
            if (statusEl && matchedCount % 10 === 0) {
                statusEl.innerHTML = `<span style="color:#6b7280;">⏳ ${matchedCount}개 처리 중...</span>`;
            }
        }
        
 // 폴더 경로 저장 (localStorage)
        if (folderPath) {
            localStorage.setItem('awardPhoto_lastFolder', folderPath);
        }
        
 // 콘솔에 로드된 파일 수 출력
        console.log(` 포상사진 폴더 로드 완료: ${matchedCount}개 (${folderPath})`);
        
 // 상태 업데이트
        if (statusEl) {
            if (matchedCount > 0) {
                statusEl.innerHTML = `<span style="color:#10b981;">✓ ${matchedCount}개 사진 로드됨 (${folderPath || '폴더'})</span>`;
            } else {
                statusEl.innerHTML = `<span style="color:#f59e0b;">이미지 파일이 없습니다</span>`;
            }
        }
        
        console.log(` 포상사진 폴더 로드 완료: ${matchedCount}개 (${folderPath})`);
        
    } catch (error) {
        console.error(' 사진 폴더 처리 오류:', error);
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#ef4444;">오류 발생</span>`;
        }
    }
}

/**
 * 포상에 맞는 사진 찾기
 * @param {string} name - 직원 이름
 * @param {string} date - 수상일 (YYYY-MM-DD)
 * @returns {string|null} Blob URL 또는 null
 */
function _findAwardPhoto(name, date) {
    if (!name || !date || _awardPhotoMap.size === 0) return null;
    
    const formatted = _formatDate(date);
    if (!formatted) {
        console.log(`️ 날짜 포맷 실패: ${name}, 원본 날짜: "${date}"`);
        return null;
    }
    
    const parts = formatted.split('-');
    if (parts.length !== 3) {
        console.log(`️ 날짜 파싱 실패: ${name}, 포맷된 날짜: "${formatted}"`);
        return null;
    }
    
    const year = parts[0];
    const month = parts[1];           // 0 포함 (예: "06")
    const monthInt = parseInt(month, 10);  // 0 없음 (예: 6)
    const day = parts[2];             // 0 포함 (예: "07")
    const dayInt = parseInt(day, 10);      // 0 없음 (예: 7)
    
 // 확장자 목록
    const extensions = ['jpg', 'jpeg', 'png', 'JPG', 'JPEG', 'PNG', 'gif', 'webp', 'GIF', 'WEBP'];
    
 // ===== 1단계: 괄호 형식 - 가장 일반적 =====
 // 날짜 형식 조합 (점, 하이픈, 슬래시, 언더스코어, 붙여쓰기, 공백)
    const dateFormats = [
 // 점 구분자
        `${year}.${monthInt}.${dayInt}`,      // 2025.6.7
        `${year}.${month}.${dayInt}`,         // 2025.06.7
        `${year}.${monthInt}.${day}`,         // 2025.6.07
        `${year}.${month}.${day}`,            // 2025.06.07
 // 점 + 공백
        `${year}. ${monthInt}. ${dayInt}`,    // 2025. 6. 7
        `${year}. ${month}. ${dayInt}`,       // 2025. 06. 7
        `${year}. ${monthInt}. ${day}`,       // 2025. 6. 07
        `${year}. ${month}. ${day}`,          // 2025. 06. 07
        `${year}. ${monthInt}.${dayInt}`,     // 2025. 6.7 (공백 불규칙)
        `${year}.${monthInt}. ${dayInt}`,     // 2025.6. 7 (공백 불규칙)
 // 하이픈 구분자
        `${year}-${monthInt}-${dayInt}`,      // 2025-6-7
        `${year}-${month}-${dayInt}`,         // 2025-06-7
        `${year}-${monthInt}-${day}`,         // 2025-6-07
        `${year}-${month}-${day}`,            // 2025-06-07
 // 슬래시 구분자
        `${year}/${monthInt}/${dayInt}`,
        `${year}/${month}/${day}`,
 // 언더스코어 구분자
        `${year}_${monthInt}_${dayInt}`,
        `${year}_${month}_${day}`,
 // 붙여쓰기
        `${year}${month}${day}`,              // 20250607
    ];
    
 // 괄호 형식으로 모든 조합 시도
    for (const dateFormat of dateFormats) {
        for (const ext of extensions) {
            const fileName = `${name}(${dateFormat}).${ext}`;
            if (_awardPhotoMap.has(fileName)) {
                console.log(` 사진 매칭 성공: ${fileName}`);
                return _awardPhotoMap.get(fileName);
            }
        }
    }
    
 // ===== 2단계: 괄호 없는 형식 =====
    const separators = ['_', '-', ' ', ''];
    for (const dateFormat of dateFormats) {
        for (const sep of separators) {
            for (const ext of extensions) {
                const fileName = `${name}${sep}${dateFormat}.${ext}`;
                if (_awardPhotoMap.has(fileName)) {
                    console.log(` 사진 매칭 성공 (대체 형식): ${fileName}`);
                    return _awardPhotoMap.get(fileName);
                }
            }
        }
    }
    
 // ===== 3단계: 끝에 점이 있는 형식 (예: 2025.6.7.) =====
    const dateFormatsWithDot = dateFormats.filter(f => f.includes('.')).map(f => f + '.');
    for (const dateFormat of dateFormatsWithDot) {
        for (const ext of extensions) {
            const fileName = `${name}(${dateFormat}).${ext}`;
            if (_awardPhotoMap.has(fileName)) {
                console.log(` 사진 매칭 성공 (점 포함): ${fileName}`);
                return _awardPhotoMap.get(fileName);
            }
        }
    }
    
 // ===== 4단계: 전각 괄호 형식 =====
    for (const dateFormat of dateFormats) {
        for (const ext of extensions) {
            const fileName = `${name}（${dateFormat}）.${ext}`;  // 전각 괄호
            if (_awardPhotoMap.has(fileName)) {
                console.log(` 사진 매칭 성공 (전각 괄호): ${fileName}`);
                return _awardPhotoMap.get(fileName);
            }
        }
    }
    
 // 매칭 실패 시 디버깅 정보 출력
    console.log(` 사진 매칭 실패: ${name} (${formatted}), 원본 날짜: "${date}"`);
    console.log(`   시도한 파일명 예시: ${name}(${year}.${monthInt}.${dayInt}).jpg, ${name}(${year}.${month}.${day}).jpg ...`);
    
    return null;
}

/**
 * 포상사진 대상 목록
 */
function showPhotosList() {
    const startYear = parseInt(document.getElementById('photo-start-year')?.value) || 2020;
    const endYear = parseInt(document.getElementById('photo-end-year')?.value) || new Date().getFullYear();
    const employeeSearch = document.getElementById('photo-employee-search')?.value?.trim() || '';
    
    let awards = awardsManager.getAll().filter(a => {
        const year = parseInt(a.year);
        if (year < startYear || year > endYear) return false;
        if (a.type !== '외부' || a.status !== '선정') return false;
        
 // 직원 검색 (퇴사자 포함)
        if (employeeSearch && !a.name?.includes(employeeSearch)) return false;
        
        return true;
    });
    
    awards.sort((a, b) => new Date(a.awardDate || '9999') - new Date(b.awardDate || '9999'));
    
    const resultArea = document.getElementById('report-result-area');
    
    if (awards.length === 0) {
        resultArea.innerHTML = '<div class="empty-state"><p>조건에 맞는 선정된 외부 포상이 없습니다.</p></div>';
        return;
    }
    
 // 폴더 선택 여부 확인
    const folderLoaded = _awardPhotoMap.size > 0;
    
 // 매칭 통계
    let matchedCount = 0;
    const awardsWithStatus = awards.map(a => {
        const photo = _findAwardPhoto(a.name, a.awardDate);
        if (photo) matchedCount++;
        return { ...a, hasPhoto: !!photo };
    });
    
 // 검색 조건 표시
    const searchInfo = employeeSearch ? ` | 검색: "${employeeSearch}"` : '';
    
    resultArea.innerHTML = `
        <div class="report-summary">
            <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 출력 대상 목록 (총 ${awards.length}건 - 선정된 외부 포상${searchInfo})</h4>
            <div style="font-size:12px; color:#64748b;">
                ${folderLoaded ? 
                    `<span style="color:#10b981;">✓ 사진 매칭: ${matchedCount}/${awards.length}건</span>` : 
                    `<span style="color:#f59e0b;">폴더를 선택하면 사진 매칭 여부를 확인할 수 있습니다</span>`
                }
            </div>
        </div>
        <div class="report-result-wrap">
            <table class="report-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>성명</th>
                        <th>수상일</th>
                        <th>포상내역</th>
                        <th>예상 파일명</th>
                        ${folderLoaded ? '<th>사진</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${awardsWithStatus.map((a, idx) => {
                        const fileName = _generatePhotoFileName(a.name, a.awardDate);
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${a.name || ''}</td>
                                <td>${_formatDate(a.awardDate)}</td>
                                <td class="text-left">${a.awardName || ''}</td>
                                <td><code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:11px;">${fileName}</code></td>
                                ${folderLoaded ? `
                                    <td>
                                        ${a.hasPhoto ? 
                                            '<span style="color:#10b981; font-weight:600;">✓ 있음</span>' : 
                                            '<span style="color:#ef4444;">✗ 없음</span>'
                                        }
                                    </td>
                                ` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 파일명 생성 (표시용)
 */
function _generatePhotoFileName(name, date) {
    if (!date) return `${name}(?).jpg`;
    
    const formatted = _formatDate(date);
    const parts = formatted.split('-');
    if (parts.length !== 3) return `${name}(${date}).jpg`;
    
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    return `${name}(${year}.${month}.${day}).jpg`;
}

/**
 * 포상사진 출력 실행
 */
function printPhotos() {
    const startYear = parseInt(document.getElementById('photo-start-year')?.value) || 2020;
    const endYear = parseInt(document.getElementById('photo-end-year')?.value) || new Date().getFullYear();
    const employeeSearch = document.getElementById('photo-employee-search')?.value?.trim() || '';
    
 // 폴더 선택 확인
    if (_awardPhotoMap.size === 0) {
        alert('[주의] 먼저 사진 폴더를 선택해주세요.');
        return;
    }
    
    let awards = awardsManager.getAll().filter(a => {
        const year = parseInt(a.year);
        if (year < startYear || year > endYear) return false;
        if (a.type !== '외부' || a.status !== '선정') return false;
        
 // 직원 검색 (퇴사자 포함)
        if (employeeSearch && !a.name?.includes(employeeSearch)) return false;
        
        return true;
    });
    
    if (awards.length === 0) {
        alert('[주의] 조건에 맞는 선정된 외부 포상이 없습니다.');
        return;
    }
    
    awards.sort((a, b) => new Date(a.awardDate || '9999') - new Date(b.awardDate || '9999'));
    
 // 새 창에서 출력
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    
    let html = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>포상 사진 출력</title>
            <style>
                @page { size: A4 portrait; margin: 10mm; }
 * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Malgun Gothic', sans-serif; }
                .controls {
                    position: fixed; top: 0; left: 0; right: 0;
                    padding: 12px 20px; background: #4f46e5; color: white;
                    display: flex; gap: 12px; align-items: center; z-index: 100;
                }
                .controls button {
                    padding: 8px 16px; border: none; border-radius: 6px;
                    cursor: pointer; font-size: 14px;
                }
                .controls .btn-primary { background: white; color: #4f46e5; }
                .controls .btn-secondary { background: rgba(255,255,255,0.2); color: white; }
                .controls .stats { margin-left: auto; font-size: 13px; }
                .photo-page {
                    width: 210mm; height: 297mm;
                    padding: 15mm; display: flex; flex-direction: column;
                    page-break-after: always; background: white;
                }
                .photo-page:last-child { page-break-after: auto; }
                .photo-container {
                    width: 100%; height: 85%;
                    display: flex; align-items: center; justify-content: center;
                }
                .photo-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .photo-not-found { color: #9ca3af; font-size: 48px; text-align: center; }
                .photo-info {
                    width: 100%; text-align: center; padding: 20px;
                    border-top: 2px solid #e5e7eb;
                }
                .photo-name { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
                .photo-date { font-size: 18px; color: #6b7280; margin-bottom: 6px; }
                .photo-detail { 
                    color: #9ca3af; 
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                }
                @media print {
                    .controls { display: none !important; }
                    .photo-page { margin: 0; border: none; }
                    body { margin: 0; padding: 0; }
                }
                @media screen {
                    body { background: #f5f7fa; padding: 60px 0 20px; }
                    .photo-page { margin: 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                }
            </style>
        </head>
        <body>
            <div class="controls">
                <button class="btn-primary" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄</button>
                <button class="btn-secondary" onclick="window.close()">닫기</button>
                <span class="stats" id="photo-stats"></span>
            </div>
    `;
    
 // 텍스트 길이에 따른 폰트 크기 계산 함수
    const getDetailFontSize = (text) => {
        const len = text.length;
        if (len <= 40) return 16;
        if (len <= 55) return 14;
        if (len <= 70) return 12;
        if (len <= 85) return 11;
        return 10;
    };
    
 // 각 포상별로 페이지 생성
    let photoFoundCount = 0;
    
    awards.forEach(award => {
        const photoUrl = _findAwardPhoto(award.name, award.awardDate);
        const hasPhoto = !!photoUrl;
        if (hasPhoto) photoFoundCount++;
        
 // 상세 정보 텍스트 생성 및 폰트 크기 계산
        const detailText = [award.awardName, award.honor, award.organization].filter(Boolean).join(' | ');
        const detailFontSize = getDetailFontSize(detailText);
        
        html += `
            <div class="photo-page">
                <div class="photo-container">
                    ${hasPhoto ? 
                        `<img src="${photoUrl}" alt="${award.name} 포상 사진">` :
                        `<div class="photo-not-found">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><br><br>
                            이미지를 찾을 수 없습니다<br>
                            <small style="font-size:14px; color:#9ca3af; margin-top:12px; display:block;">
                                ${_generatePhotoFileName(award.name, award.awardDate)}
                            </small>
                        </div>`
                    }
                </div>
                <div class="photo-info">
                    <div class="photo-name">${award.name}</div>
                    <div class="photo-date"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${_formatDate(award.awardDate)}</div>
                    <div class="photo-detail" style="font-size: ${detailFontSize}px;">${detailText}</div>
                </div>
            </div>
        `;
    });
    
    html += `
            <script>
                document.getElementById('photo-stats').textContent = '사진 매칭: ${photoFoundCount}/${awards.length}건';
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// ===== 엑셀 다운로드 =====

/**
 * 보고서 엑셀 다운로드
 */
function exportReportToExcel(reportType) {
    const table = document.getElementById('report-table');
    if (!table) {
        alert('[주의] 보고서를 먼저 생성해주세요.');
        return;
    }
    
    try {
        const clonedTable = table.cloneNode(true);
        
 // span 태그 텍스트만 추출
        clonedTable.querySelectorAll('span').forEach(span => {
            span.replaceWith(document.createTextNode(span.textContent));
        });
        
        const wb = XLSX.utils.table_to_book(clonedTable, { sheet: '포상보고서' });
        const today = new Date().toISOString().split('T')[0];
        const filename = `포상보고서_${reportType}_${today}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        console.log(` 엑셀 다운로드: ${filename}`);
        
    } catch (error) {
        console.error(' 엑셀 다운로드 오류:', error);
        alert('엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

// ===== 포상 보고서 인쇄 =====

/**
 * 포상 보고서 인쇄 옵션 모달 표시
 */
function printAwardsReport() {
 // 현재 결과 테이블 확인
    const reportTable = document.getElementById('report-table');
    if (!reportTable) {
        alert('인쇄할 보고서가 없습니다.');
        return;
    }
    
 // 인쇄 옵션 모달 표시
    const modal = document.createElement('div');
    modal.id = 'print-options-modal';
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 포상 보고서 인쇄 설정
                </h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="print-show-title" checked 
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-size: 14px; color: #374151;">제목 표시</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="print-show-date" checked
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-size: 14px; color: #374151;">생성일 표시</span>
                    </label>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px;">
                        용지 크기
                    </label>
                    <select id="print-paper" style="
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
                    <select id="print-orientation" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                    ">
                        <option value="auto">자동 (탭에 따라)</option>
                        <option value="portrait">세로</option>
                        <option value="landscape">가로</option>
                    </select>
                    <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
 * 직원별 외부/내부 포상은 가로 방향 권장
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('print-options-modal').remove()" style="
                        padding: 10px 20px;
                        border: 1px solid #d1d5db;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">취소</button>
                    <button onclick="executeAwardsPrint()" style="
                        padding: 10px 20px;
                        border: none;
                        background: linear-gradient(135deg, #6366f1, #4f46e5);
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
}

/**
 * 실제 인쇄 실행
 */
function executeAwardsPrint() {
    try {
 // 옵션 가져오기
        const showTitle = document.getElementById('print-show-title')?.checked ?? true;
        const showDate = document.getElementById('print-show-date')?.checked ?? true;
        const paperSize = document.getElementById('print-paper')?.value || 'A4';
        const orientationOption = document.getElementById('print-orientation')?.value || 'auto';
        
 // 모달 닫기
        document.getElementById('print-options-modal')?.remove();
        
 // 현재 결과 테이블
        const reportTable = document.getElementById('report-table');
        if (!reportTable) {
            alert('인쇄할 보고서가 없습니다.');
            return;
        }
        
 // 용지 방향 결정
        let orientation = orientationOption;
        if (orientation === 'auto') {
            orientation = (currentReportTab === 'employee-external' || 
                          currentReportTab === 'employee-internal') 
                          ? 'landscape' : 'portrait';
        }
        
 // 테이블 복제
        const tableClone = reportTable.cloneNode(true);
        
 // 제목 생성
        const tabInfo = REPORT_TABS[currentReportTab] || { name: '포상 현황', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>' };
        const titleText = `${tabInfo.icon} ${tabInfo.name}`;
        const today = new Date().toISOString().split('T')[0];
        
        let titleHTML = '';
        if (showTitle) {
            titleHTML = `<h2 style="text-align:center;margin-bottom:15px;font-size:18px;font-weight:600;">${titleText}</h2>`;
        }
        
        let dateHTML = '';
        if (showDate) {
            dateHTML = `<div style="text-align:right;margin-bottom:10px;font-size:11px;color:#666;">생성일: ${today}</div>`;
        }
        
        const fontSize = paperSize === 'A3' ? '9px' : (orientation === 'landscape' ? '8px' : '10px');
        const cellPadding = paperSize === 'A3' ? '5px 6px' : (orientation === 'landscape' ? '4px 5px' : '5px 6px');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>포상 보고서 인쇄</title>
                <style>
                    @page { size: ${paperSize} ${orientation}; margin: 5mm; }
                    body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 10px; }
                    table { font-size: ${fontSize}; border-collapse: collapse; width: 100%; table-layout: auto; }
                    th, td { padding: ${cellPadding}; border: 1px solid #333; text-align: center; }
                    th { background: #e0e7ff !important; color: #1e293b; font-weight: bold; white-space: nowrap; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    td:last-child { white-space: nowrap; }
                    td.text-left { white-space: normal; word-break: break-word; }
                    
 /* 선정여부 색상 (미리보기와 동일) */
                    .status-selected { color: #111 !important; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-pending { color: #2563eb !important; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-not-selected { color: #9ca3af !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    
 /* 연도별 포상 표시 색상 */
                    .award-selected { color: #111 !important; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .award-pending { color: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .award-rejected { color: #9ca3af !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    
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
            window.electronAPI.openInBrowser(htmlContent, 'awards_report_print.html');
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                alert('팝업이 차단되었습니다.');
            }
        }
        
        console.log(' 포상 보고서 인쇄 완료');
        
    } catch (error) {
        console.error(' 인쇄 오류:', error);
        alert('인쇄 중 오류가 발생했습니다.');
    }
}

// ===== 초기화 =====
console.log(' 포상현황_인사.js 로드 완료 (v2.0 - 7개 보고서 통합)');
