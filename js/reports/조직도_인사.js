/**
 * 조직도_인사.js - 조직도 생성 및 출력
 * 
 * 표 형식 및 계층형 조직도 생성
 * - 기준일 기반 재직자 추출
 * - 직위 순서 / 호봉 기반 정렬
 * - 육아휴직자 포함/제외 옵션
 * - 겸직 지정 기능
 * - 직종별/직위별 인원 현황표
 * - 인쇄 / 엑셀 다운로드
 * 
 * @version 6.0.2
 * @since 2025-11-27
 * 
 * [변경 이력]
 * v6.0.2 (2026-02-04) ⭐ 브라우저 인쇄 방식 적용
 * - Electron 팝업 → 시스템 브라우저 인쇄
 * - 인쇄 버튼 추가 (Ctrl+P)
 * - 임시 파일 자동 삭제 (앱 종료 시)
 *
 * v6.0.1 (2026-01-22) ⭐ 계층형 탭 버그 수정
 * - 탭 확인 로직 버그 수정 (계층형이 항상 표 형식으로 인식되던 문제)
 * - isHierarchyTab 직접 확인 방식으로 변경
 *
 * v6.0.0 (2026-01-22) 배치 API 적용 - 성능 최적화
 * - 개별 API 호출 → 배치 API (calculateBatchForEmployees)
 * - N회 API 호출 → 1회로 감소
 * - 로딩 시간 대폭 단축
 * 
 * v5.0.0 (2026-01-22) API 전용 버전
 * - 직원유틸_인사.getDynamicRankInfo() await 추가
 * - 모든 계산 로직 서버 API로 이동
 * 
 * v4.0.0 (2026-01-22) API 연동 버전
 * - RankCalculator.calculateCurrentRank → API_인사.calculateCurrentRank
 * - getEmployeesAtDate() async 변경
 * - forEach → for...of (async/await 지원)
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 호봉계산기_인사.js (DateUtils, RankCalculator)
 * - 조직도설정_인사.js (loadOrgChartSettings, getPositionRole 등)
 * - 직원유틸_인사.js (직원유틸_인사)
 * - DOM유틸_인사.js (DOM유틸_인사)
 * - 인쇄유틸_인사.js (인쇄유틸_인사)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 */

// ===== 전역 변수 =====

/**
 * 현재 겸직 설정 목록
 * @type {Array<Object>}
 */
let currentConcurrentPositions = [];

/**
 * 현재 조직도 데이터 (인쇄/다운로드용)
 * @type {Object|null}
 */
let currentOrgChartData = null;

// ===== 메인 함수 =====

/**
 * 조직도 모듈 로드
 */
function loadOrgChartModule() {
    try {
        로거_인사?.debug('조직도 모듈 로드');
        
        const container = document.getElementById('module-org-chart');
        if (!container) {
            console.error('[조직도] 컨테이너를 찾을 수 없음');
            return;
        }
        
 // 오늘 날짜
        const today = DateUtils ? DateUtils.formatDate(new Date()) : new Date().toISOString().split('T')[0];
        
 // 부서 목록 추출 (겸직 지정용)
        const departments = extractDepartmentsFromAssignments();
        
 // 재직자 목록 추출 (겸직 지정용)
        const employees = db.getActiveEmployees();
        
        container.innerHTML = generateOrgChartHTML(today, departments, employees);
        
 // 겸직 목록 초기화
        currentConcurrentPositions = [];
        
 // 기준일 변경 이벤트 리스너 추가
        const baseDateInput = document.getElementById('org-chart-base-date');
        if (baseDateInput) {
            baseDateInput.addEventListener('change', updateAutoConcurrentList);
 // 초기 로드 시 자동 겸직 현황 표시
            updateAutoConcurrentList();
        }
        
        로거_인사?.info('조직도 모듈 로드 완료');
        
    } catch (error) {
        console.error('[조직도] 모듈 로드 오류:', error);
        로거_인사?.error('모듈 로드 오류', error);
        에러처리_인사?.handle(error, '조직도 화면을 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 자동 로드된 겸직/직무대리 현황 업데이트
 */
function updateAutoConcurrentList() {
    try {
        const listContainer = document.getElementById('auto-concurrent-list');
        const baseDateStr = document.getElementById('org-chart-base-date')?.value;
        
        if (!listContainer || !baseDateStr) return;
        
 // 겸직관리 모듈에서 해당 기준일에 유효한 목록 가져오기
        let activePositions = [];
        if (typeof getActiveConcurrentPositions === 'function') {
            activePositions = getActiveConcurrentPositions(baseDateStr);
        }
        
        if (activePositions.length === 0) {
            listContainer.innerHTML = `
                <div style="padding:12px;background:#f9fafb;border-radius:6px;color:#6b7280;font-size:13px;">
                    해당 기준일에 등록된 겸직/직무대리가 없습니다.
                </div>
            `;
            return;
        }
        
        const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml 
            : (str) => String(str || '');
        
        let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        
        activePositions.forEach(pos => {
 // 직원 정보 가져오기
            let empName = '(알 수 없음)';
            const employees = db.getEmployees();
            const employee = employees.find(e => e.id === pos.employeeId);
            if (employee) {
                empName = employee.name || employee.personalInfo?.name || '(이름없음)';
            }
            
            const typeLabel = pos.type === 'acting' ? '직무대리' : '겸직';
            const typeIcon = pos.type === 'acting' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
            const typeBgColor = pos.type === 'acting' ? '#fef3c7' : '#dbeafe';
            const typeColor = pos.type === 'acting' ? '#d97706' : '#2563eb';
            
            html += `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:white;border:1px solid #e5e7eb;border-radius:6px;">
                    <span style="padding:4px 8px;background:${typeBgColor};color:${typeColor};border-radius:4px;font-size:12px;font-weight:500;">
                        ${typeIcon} ${typeLabel}
                    </span>
                    <span style="font-weight:500;">${escapeHtml(empName)}</span>
                    <span style="color:#6b7280;">→</span>
                    <span>${escapeHtml(pos.targetDept)} ${escapeHtml(pos.targetPosition || '팀장')}</span>
                    ${pos.reason ? `<span style="color:#9ca3af;font-size:12px;">(${escapeHtml(pos.reason)})</span>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error('[조직도] 자동 겸직 현황 업데이트 오류:', error);
    }
}

/**
 * 조직도 화면 HTML 생성
 * 
 * @param {string} today - 오늘 날짜 (YYYY-MM-DD)
 * @param {Array<string>} departments - 부서 목록
 * @param {Array<Object>} employees - 직원 목록
 * @returns {string} HTML 문자열
 */
function generateOrgChartHTML(today, departments, employees) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str);
    
 // 부서 옵션
    const deptOptionsHTML = departments.map(dept => 
        `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
    ).join('');
    
 // 직원 옵션 (겸직 지정용)
    const empOptionsHTML = employees.map(emp => {
        const name = emp.name || emp.personalInfo?.name || '';
        const position = emp.position || emp.currentPosition?.position || '';
        const dept = emp.department || emp.currentPosition?.dept || '';
        return `<option value="${escapeHtml(emp.id)}">${escapeHtml(name)} (${escapeHtml(position)} - ${escapeHtml(dept)})</option>`;
    }).join('');
    
    return `
        <div class="card">
            <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> 조직도</div>
            
            <!-- 탭 메뉴 -->
            <div style="display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid #e5e7eb;">
                <button type="button" id="tab-table" onclick="switchOrgChartTab('table')" 
                        class="org-chart-tab active"
                        style="padding:12px 24px;border:none;background:transparent;cursor:pointer;font-weight:500;border-bottom:2px solid #4f46e5;margin-bottom:-2px;color:#4f46e5;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg> 표 형식
                </button>
                <button type="button" id="tab-hierarchy" onclick="switchOrgChartTab('hierarchy')" 
                        class="org-chart-tab"
                        style="padding:12px 24px;border:none;background:transparent;cursor:pointer;font-weight:500;color:#6b7280;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="2" y="18" width="8" height="4" rx="1"/><rect x="14" y="18" width="8" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="6" y1="14" x2="18" y2="14"/><line x1="6" y1="14" x2="6" y2="18"/><line x1="18" y1="14" x2="18" y2="18"/></svg> 계층형
                </button>
            </div>
            
            <!-- 설정 영역 -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:24px;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;margin-bottom:16px;">
                    <!-- 기준일 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 기준일</label>
                        <input type="date" id="org-chart-base-date" value="${today}" 
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                    
                    <!-- 육아휴직자 포함 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 육아휴직자</label>
                        <div style="display:flex;gap:16px;padding-top:8px;">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="radio" name="org-chart-maternity" value="include" checked>
                                <span>포함</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="radio" name="org-chart-maternity" value="exclude">
                                <span>제외</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- 겸직/직무대리 현황 -->
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
                    <label style="display:block;font-weight:500;margin-bottom:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> 겸직/직무대리 현황</label>
                    <p style="color:#6b7280;font-size:13px;margin-bottom:12px;">
                        <a href="javascript:navigateToModule('concurrent-position')" style="color:#4f46e5;text-decoration:underline;">
                            시스템 > 겸직/직무대리 관리
                        </a>에서 등록된 내용이 기준일에 따라 자동 반영됩니다.
                    </p>
                    
                    <!-- 자동 로드된 목록 표시 영역 -->
                    <div id="auto-concurrent-list" style="margin-bottom:12px;">
                        <!-- 기준일 변경 시 동적으로 업데이트됨 -->
                    </div>
                </div>
                
                <!-- 생성 버튼 -->
                <div style="margin-top:20px;display:flex;justify-content:center;">
                    <button type="button" onclick="generateOrgChart()" class="btn btn-primary" style="padding:12px 32px;font-size:15px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 조직도 생성
                    </button>
                </div>
            </div>
            
            <!-- 결과 영역 -->
            <div id="org-chart-result" style="display:none;">
                <!-- 조직도 표시 영역 -->
                <div id="org-chart-content"></div>
                
                <!-- 인원 현황표 -->
                <div id="org-chart-stats" style="margin-top:32px;"></div>
                
                <!-- 출력 버튼 -->
                <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;padding-top:16px;border-top:1px solid #e5e7eb;">
                    <button type="button" onclick="showPrintOptions()" class="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄
                    </button>
                    <button type="button" onclick="downloadOrgChartExcel()" class="btn btn-success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀 다운로드
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 인쇄 옵션 모달 -->
        <div id="print-options-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;justify-content:center;align-items:center;">
            <div style="background:white;padding:24px;border-radius:12px;min-width:320px;max-width:400px;">
                <h3 style="margin:0 0 20px 0;font-size:18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄 옵션</h3>
                
                <!-- 페이지 방향 -->
                <div style="margin-bottom:20px;">
                    <p style="font-weight:500;margin-bottom:10px;">페이지 방향</p>
                    <div style="display:flex;gap:16px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="print-orientation" value="portrait" checked>
                            <span>세로</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="print-orientation" value="landscape">
                            <span>가로</span>
                        </label>
                    </div>
                </div>
                
                <!-- 인원 현황 포함 -->
                <div style="margin-bottom:24px;">
                    <p style="font-weight:500;margin-bottom:10px;">인쇄 내용</p>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="print-include-stats" checked style="width:18px;height:18px;">
                        <span>인원 현황 포함</span>
                    </label>
                </div>
                
                <!-- 버튼 -->
                <div style="display:flex;gap:12px;justify-content:flex-end;">
                    <button type="button" onclick="closePrintOptions()" 
                            style="padding:10px 20px;border:1px solid #d1d5db;background:white;border-radius:6px;cursor:pointer;">
                        취소
                    </button>
                    <button type="button" onclick="executePrint()" 
                            style="padding:10px 20px;border:none;background:#4f46e5;color:white;border-radius:6px;cursor:pointer;">
                        인쇄
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 숨겨진 데이터 -->
        <script id="org-chart-dept-data" type="application/json">${JSON.stringify(departments)}</script>
        <script id="org-chart-emp-data" type="application/json">${JSON.stringify(employees.map(e => ({id: e.id, name: e.name, position: e.position, department: e.department})))}</script>
    `;
}

// ===== 탭 전환 =====

/**
 * 조직도 탭 전환
 * 
 * @param {string} tabName - 탭 이름 ('table' 또는 'hierarchy')
 */
function switchOrgChartTab(tabName) {
 // 탭 버튼 스타일 변경
    const tableTab = document.getElementById('tab-table');
    const hierarchyTab = document.getElementById('tab-hierarchy');
    
 // 모든 탭 비활성화
    [tableTab, hierarchyTab].forEach(tab => {
        if (tab) {
            tab.style.borderBottom = '2px solid transparent';
            tab.style.color = '#6b7280';
            tab.classList.remove('active');
        }
    });
    
 // 선택한 탭 활성화
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.style.borderBottom = '2px solid #4f46e5';
        activeTab.style.color = '#4f46e5';
        activeTab.classList.add('active');
    }
    
    console.log('[조직도] 탭 전환:', tabName);
    
 // 이미 생성된 결과가 있으면 다시 생성
    if (currentOrgChartData && currentOrgChartData.hierarchy) {
        const contentDiv = document.getElementById('org-chart-content');
        const showRole = currentOrgChartData.showRoleInRemark !== false;
        
        if (contentDiv) {
            if (tabName === 'table') {
                contentDiv.innerHTML = generateTableOrgChart(
                    currentOrgChartData.hierarchy, 
                    currentOrgChartData.baseDate, 
                    currentOrgChartData.includeMaternity,
                    showRole
                );
            } else {
                contentDiv.innerHTML = generateHierarchyOrgChart(
                    currentOrgChartData.hierarchy, 
                    currentOrgChartData.baseDate, 
                    currentOrgChartData.includeMaternity,
                    showRole
                );
            }
        }
    }
}

// ===== 겸직 관리 =====

/**
 * 겸직 추가
 */
function addConcurrentPosition() {
    try {
        const deptDataEl = document.getElementById('org-chart-dept-data');
        const empDataEl = document.getElementById('org-chart-emp-data');
        
        if (!deptDataEl || !empDataEl) return;
        
        const departments = JSON.parse(deptDataEl.textContent);
        const employees = JSON.parse(empDataEl.textContent);
        
        const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml 
            : (str) => String(str);
        
        const listContainer = document.getElementById('concurrent-position-list');
        if (!listContainer) return;
        
        const index = listContainer.querySelectorAll('.concurrent-row').length;
        
        const empOptionsHTML = employees.map(emp => 
            `<option value="${escapeHtml(emp.id)}">${escapeHtml(emp.name)} (${escapeHtml(emp.position || '')})</option>`
        ).join('');
        
        const deptOptionsHTML = departments.map(dept => 
            `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
        ).join('');
        
        const newRow = document.createElement('div');
        newRow.className = 'concurrent-row';
        newRow.dataset.index = index;
        newRow.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:12px;padding:12px;background:white;border:1px solid #e5e7eb;border-radius:8px;';
        newRow.innerHTML = `
            <select class="concurrent-employee" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                <option value="">직원 선택</option>
                ${empOptionsHTML}
            </select>
            <span style="color:#6b7280;">→</span>
            <select class="concurrent-dept" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                <option value="">부서 선택</option>
                ${deptOptionsHTML}
            </select>
            <span style="color:#6b7280;">부서장 겸직</span>
            <button type="button" onclick="removeConcurrentPosition(${index})" 
                    style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;">
                삭제
            </button>
        `;
        
        listContainer.appendChild(newRow);
        
    } catch (error) {
        console.error('[조직도] 겸직 추가 오류:', error);
    }
}

/**
 * 겸직 삭제
 * 
 * @param {number} index - 삭제할 행의 인덱스
 */
function removeConcurrentPosition(index) {
    try {
        const listContainer = document.getElementById('concurrent-position-list');
        const row = listContainer?.querySelector(`.concurrent-row[data-index="${index}"]`);
        
        if (row) {
            row.remove();
        }
        
    } catch (error) {
        console.error('[조직도] 겸직 삭제 오류:', error);
    }
}

/**
 * 현재 겸직 설정 수집 (자동 로드)
 * 
 * @param {string} baseDateStr - 기준일
 * @returns {Array<Object>} 겸직 설정 배열
 */
function collectConcurrentPositions(baseDateStr) {
    const result = [];
    
    console.log('[조직도] 겸직 수집 시작, 기준일:', baseDateStr);
    
 // 겸직관리 모듈에서 자동 로드 (기준일에 유효한 것만)
    if (typeof getActiveConcurrentPositions === 'function') {
        const autoLoaded = getActiveConcurrentPositions(baseDateStr);
        console.log('[조직도] 자동 로드된 겸직:', autoLoaded);
        
        autoLoaded.forEach(pos => {
            result.push({
                employeeId: pos.employeeId,
                department: pos.targetDept,
                position: pos.targetPosition,
                type: pos.type,  // 'concurrent' 또는 'acting'
                reason: pos.reason,
                isAutoLoaded: true
            });
        });
    } else {
        console.warn('[조직도] getActiveConcurrentPositions 함수를 찾을 수 없음');
    }
    
    console.log('[조직도] 최종 겸직 목록:', result);
    return result;
}

// ===== 조직도 생성 =====

/**
 * 조직도 생성
 */
async function generateOrgChart() {
    try {
        로거_인사?.debug('조직도 생성 시작');
        
 // 설정 수집
        const baseDateStr = document.getElementById('org-chart-base-date')?.value;
        const maternityRadio = document.querySelector('input[name="org-chart-maternity"]:checked');
        const includeMaternity = maternityRadio?.value === 'include';
        
        console.log('[조직도] 육아휴직 설정:', {
            radioElement: maternityRadio,
            radioValue: maternityRadio?.value,
            includeMaternity: includeMaternity
        });
        
        if (!baseDateStr) {
            alert('기준일을 선택해주세요.');
            return;
        }
        
 // 겸직/직무대리 수집 (자동 + 수동)
        const concurrentPositions = collectConcurrentPositions(baseDateStr);
        
        const baseDate = new Date(baseDateStr);
        
 // 조직도 설정 로드
        const orgChartSettings = loadOrgChartSettings();
        if (!orgChartSettings.positionSettings || orgChartSettings.positionSettings.length === 0) {
            alert('직위 순서 설정이 필요합니다.\n\n시스템 > 조직도 설정에서 직위 순서를 먼저 설정해주세요.');
            return;
        }
        
 // 기준일 재직자 추출
        let employees = await getEmployeesAtDate(baseDate);
        console.log('[조직도] 필터링 전 직원 수:', employees.length);
        
 // 육아휴직자 필터링
        if (!includeMaternity) {
            const beforeCount = employees.length;
            employees = employees.filter(emp => {
                const onLeave = isOnMaternityLeave(emp, baseDate);
                if (onLeave) {
                    console.log('[조직도] 육아휴직으로 제외:', emp.name);
                }
                return !onLeave;
            });
            console.log('[조직도] 육아휴직 필터링:', beforeCount, '→', employees.length);
        } else {
            console.log('[조직도] 육아휴직자 포함 (필터링 안함)');
        }
        
        if (employees.length === 0) {
            alert('해당 기준일에 재직 중인 직원이 없습니다.');
            return;
        }
        
 // 부서 통합 적용
        employees = applyDepartmentMerge(employees, orgChartSettings.departmentMerge);
        
 // 계층 구조로 분류
        const hierarchy = categorizeEmployees(employees, orgChartSettings, concurrentPositions, baseDate);
        
 // 현재 탭 확인 (기본값: 표 형식)
 // ⭐ v6.0.1: 탭 확인 로직 수정 - 계층형 탭이 활성화되었는지 직접 확인
        const tableTab = document.getElementById('tab-table');
        const hierarchyTab = document.getElementById('tab-hierarchy');
        
 // 계층형 탭이 활성화되어 있는지 확인
        const isHierarchyTab = hierarchyTab?.classList.contains('active') || 
                              (hierarchyTab?.style.borderBottom && hierarchyTab.style.borderBottom.includes('4f46e5'));
        const isTableTab = !isHierarchyTab;
        
        console.log('[조직도] 현재 탭:', isTableTab ? '표 형식' : '계층형');
        
 // 결과 표시
        const contentDiv = document.getElementById('org-chart-content');
        const statsDiv = document.getElementById('org-chart-stats');
        const resultDiv = document.getElementById('org-chart-result');
        
 // 역할 표시 설정
        const showRoleInRemark = orgChartSettings.showRoleInRemark !== false;
        
        if (isTableTab) {
 // 표 형식
            contentDiv.innerHTML = generateTableOrgChart(hierarchy, baseDateStr, includeMaternity, showRoleInRemark);
        } else {
 // 계층형
            contentDiv.innerHTML = generateHierarchyOrgChart(hierarchy, baseDateStr, includeMaternity, showRoleInRemark);
        }
        
 // 인원 현황표 (직위 순서 설정 포함)
        statsDiv.innerHTML = generatePersonnelStats(employees, orgChartSettings);
        
 // 결과 표시
        resultDiv.style.display = 'block';
        
 // 현재 데이터 저장 (인쇄/다운로드용)
        currentOrgChartData = {
            hierarchy,
            employees,
            baseDate: baseDateStr,
            includeMaternity,
            showRoleInRemark,
            settings: orgChartSettings
        };
        
        로거_인사?.info('조직도 생성 완료', { 
            employeeCount: employees.length,
            baseDate: baseDateStr 
        });
        
    } catch (error) {
        console.error('[조직도] 생성 오류:', error);
        로거_인사?.error('조직도 생성 오류', error);
        에러처리_인사?.handle(error, '조직도 생성 중 오류가 발생했습니다.');
    }
}

/**
 * 기준일 기준 재직자 추출
 * 
 * @param {Date} baseDate - 기준일
 * @returns {Promise<Array<Object>>} 재직자 목록
 */
async function getEmployeesAtDate(baseDate) {
 // ⭐ v1.0.1: db.getEmployeesAtDate() 사용 (코드 중복 제거)
    const baseDateStr = DateUtils.formatDate(baseDate);
    const employees = db.getEmployeesAtDate(baseDateStr);
    
 // ⭐ v6.0.0: 배치 API로 전체 직원 한 번에 계산 (성능 최적화)
    let batchResults = new Map();
    if (typeof API_인사 !== 'undefined' && typeof API_인사.calculateBatchForEmployees === 'function') {
        try {
 // 호봉제 직원만 필터링 (배치 계산 대상)
            const rankBasedEmployees = employees.filter(emp => 
                emp.rank?.isRankBased !== false && emp.rank?.startRank && emp.rank?.firstUpgradeDate
            );
            
            if (rankBasedEmployees.length > 0) {
                console.log('[조직도] 배치 API 시작:', rankBasedEmployees.length, '명');
                batchResults = await API_인사.calculateBatchForEmployees(rankBasedEmployees, baseDateStr);
                console.log('[조직도] 배치 API 완료:', batchResults.size, '명');
            }
        } catch (e) {
            console.error('[조직도] 배치 API 오류, 로컬 계산으로 전환:', e);
        }
    }
    
    const result = [];
    
    for (const emp of employees) {
 // 기준일 기준 발령 정보 가져오기
        const assignmentInfo = getAssignmentAtDate(emp, baseDate);
        
 // ⭐ v6.0.0: 배치 결과에서 호봉 가져오기 (개별 API 호출 제거)
        let currentRank = null;
        if (emp.rank?.isRankBased !== false && emp.rank?.startRank) {
 // 1. 배치 결과에서 조회
            const batchResult = batchResults.get(emp.id);
            if (batchResult && batchResult.currentRank !== undefined) {
                currentRank = batchResult.currentRank;
            } else if (emp.rank?.firstUpgradeDate) {
 // 2. 배치에 없으면 로컬 계산 (fallback)
                try {
                    if (typeof RankCalculator !== 'undefined' && RankCalculator.calculateCurrentRank) {
                        currentRank = RankCalculator.calculateCurrentRank(
                            emp.rank.startRank,
                            emp.rank.firstUpgradeDate,
                            baseDateStr
                        );
                    } else {
 // RankCalculator도 없으면 저장된 startRank 사용
                        currentRank = emp.rank.startRank;
                    }
                } catch (e) {
 // 호봉 계산 실패 시 startRank 사용
                    console.warn('[조직도] 호봉 계산 실패, startRank 사용:', emp.id, e);
                    currentRank = emp.rank.startRank;
                }
            } else {
 // firstUpgradeDate 없으면 startRank 사용
                currentRank = emp.rank.startRank;
            }
        }
        
 // 이름 가져오기 (personalInfo.name 또는 name)
        const empName = emp.name || emp.personalInfo?.name || '';
        
 // 현재 직위 정보 (currentPosition에서 가져오기)
        const currentDept = emp.currentPosition?.dept || emp.department || '';
        const currentPosition = emp.currentPosition?.position || emp.position || '';
        const currentGrade = emp.currentPosition?.grade || emp.grade || '';
        const currentJobType = emp.currentPosition?.jobType || emp.jobType || '';
        
        result.push({
            id: emp.id,
            name: empName,
            department: assignmentInfo.department || currentDept,
            position: assignmentInfo.position || currentPosition,
            grade: assignmentInfo.grade || currentGrade,
            jobType: currentJobType,
            entryDate: emp.employment?.entryDate,
            currentRank: currentRank,
            isRankBased: emp.rank?.isRankBased !== false,
            originalData: emp
        });
    }
    
    return result;
}

/**
 * 기준일 기준 발령 정보 가져오기
 * 
 * @param {Object} emp - 직원 객체
 * @param {Date} baseDate - 기준일
 * @returns {Object} 발령 정보
 */
function getAssignmentAtDate(emp, baseDate) {
 // 현재 직위 정보 (기본값)
    const currentDept = emp.currentPosition?.dept || emp.department || '';
    const currentPosition = emp.currentPosition?.position || emp.position || '';
    const currentGrade = emp.currentPosition?.grade || emp.grade || '';
    
    if (!emp.assignments || !Array.isArray(emp.assignments) || emp.assignments.length === 0) {
        return {
            department: currentDept,
            position: currentPosition,
            grade: currentGrade
        };
    }
    
 // 기준일 이전의 발령 중 가장 최근 것
    const validAssignments = emp.assignments
        .filter(a => a.date && new Date(a.date) <= baseDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (validAssignments.length > 0) {
        const latest = validAssignments[0];
        return {
            department: latest.dept || latest.department || currentDept,
            position: latest.position || currentPosition,
            grade: latest.grade || currentGrade
        };
    }
    
    return {
        department: currentDept,
        position: currentPosition,
        grade: currentGrade
    };
}

/**
 * 육아휴직 중인지 확인
 * 
 * @param {Object} emp - 직원 객체
 * @param {Date} baseDate - 기준일
 * @returns {boolean} 육아휴직 중 여부
 */
function isOnMaternityLeave(emp, baseDate) {
    const originalEmp = emp.originalData || emp;
    
    if (!originalEmp.maternityLeave) {
        return false;
    }
    
    const baseDateStr = DateUtils ? DateUtils.formatDate(baseDate) : baseDate.toISOString().split('T')[0];
    const ml = originalEmp.maternityLeave;
    
 // 새로운 구조: { isOnLeave, startDate, endDate, history }
    if (typeof ml === 'object' && !Array.isArray(ml)) {
 // isOnLeave 플래그 확인
        if (ml.isOnLeave === true) {
 // 기간 확인
            if (ml.startDate && ml.endDate) {
                return ml.startDate <= baseDateStr && ml.endDate >= baseDateStr;
            }
            return true; // 기간 없이 isOnLeave만 있으면 휴직 중으로 판단
        }
        
 // history 배열 확인
        if (ml.history && Array.isArray(ml.history)) {
            return ml.history.some(leave => {
                if (!leave.startDate || !leave.endDate) return false;
                return leave.startDate <= baseDateStr && leave.endDate >= baseDateStr;
            });
        }
        
        return false;
    }
    
 // 레거시 구조: 배열 형태
    if (Array.isArray(ml)) {
        return ml.some(leave => {
            if (!leave.startDate || !leave.endDate) return false;
            return leave.startDate <= baseDateStr && leave.endDate >= baseDateStr;
        });
    }
    
    return false;
}

/**
 * 부서 통합 적용
 * 
 * @param {Array<Object>} employees - 직원 목록
 * @param {Array<Object>} mergeSettings - 부서 통합 설정
 * @returns {Array<Object>} 통합 적용된 직원 목록
 */
function applyDepartmentMerge(employees, mergeSettings) {
    if (!mergeSettings || mergeSettings.length === 0) {
        return employees;
    }
    
    const mergeMap = new Map(mergeSettings.map(m => [m.source, m.target]));
    
    return employees.map(emp => {
        const mergedDept = mergeMap.get(emp.department);
        if (mergedDept) {
            return {
                ...emp,
                department: mergedDept,
                originalDepartment: emp.department
            };
        }
        return emp;
    });
}

/**
 * 직원들을 계층 구조로 분류
 * 
 * @param {Array<Object>} employees - 직원 목록
 * @param {Object} settings - 조직도 설정
 * @param {Array<Object>} concurrentPositions - 겸직 설정
 * @param {Date} baseDate - 기준일
 * @returns {Object} 계층 구조 객체
 */
function categorizeEmployees(employees, settings, concurrentPositions, baseDate) {
    const hierarchy = {
        director: null,
        viceDirector: null,
        departments: {}
    };
    
 // 직위별 역할 맵
    const positionRoleMap = new Map(
        settings.positionSettings.map(p => [p.name, { role: p.role, order: p.order }])
    );
    
 // 직원 분류
    employees.forEach(emp => {
        const positionInfo = positionRoleMap.get(emp.position) || { role: 'staff', order: 999 };
        
        if (positionInfo.role === 'director') {
            hierarchy.director = emp;
        } else if (positionInfo.role === 'viceDirector') {
            hierarchy.viceDirector = emp;
        } else {
 // 부서별 그룹화
            if (!hierarchy.departments[emp.department]) {
                hierarchy.departments[emp.department] = {
                    name: emp.department,
                    head: null,
                    members: []
                };
            }
            
            if (positionInfo.role === 'deptHead') {
                hierarchy.departments[emp.department].head = emp;
            } else {
                hierarchy.departments[emp.department].members.push(emp);
            }
        }
    });
    
 // 겸직/직무대리 적용
    console.log('[조직도] 겸직 적용 시작, 겸직 수:', concurrentPositions.length);
    console.log('[조직도] 부서 목록:', Object.keys(hierarchy.departments));
    
    concurrentPositions.forEach(cp => {
        console.log('[조직도] 겸직 처리:', cp);
        const employee = employees.find(e => e.id === cp.employeeId);
        console.log('[조직도] 겸직 직원 찾기:', employee ? employee.name : '못찾음');
        console.log('[조직도] 대상 부서 존재:', cp.department, hierarchy.departments[cp.department] ? '있음' : '없음');
        
        if (employee && hierarchy.departments[cp.department]) {
            const positionType = cp.type === 'acting' ? 'acting' : 'concurrent';
            const typeLabel = cp.type === 'acting' ? '직무대리' : '겸직';
            
            hierarchy.departments[cp.department].concurrentHead = {
                ...employee,
                isConcurrent: positionType === 'concurrent',
                isActing: positionType === 'acting',
                concurrentType: positionType,
                concurrentTypeLabel: typeLabel,
                concurrentReason: cp.reason
            };
            console.log('[조직도] 겸직 적용 완료:', cp.department);
        }
    });
    
 // 부서 내 팀원 정렬 (원래 부서 → 통합된 부서, 그 다음 직위 순서 → 호봉 → 입사일)
    Object.values(hierarchy.departments).forEach(dept => {
        dept.members.sort((a, b) => {
 // 0차: 통합된 부서 팀원은 맨 아래 (originalDepartment가 있으면 통합된 팀원)
            const isMergedA = a.originalDepartment ? 1 : 0;
            const isMergedB = b.originalDepartment ? 1 : 0;
            if (isMergedA !== isMergedB) return isMergedA - isMergedB;
            
 // 1차: 직위 순서
            const orderA = positionRoleMap.get(a.position)?.order || 999;
            const orderB = positionRoleMap.get(b.position)?.order || 999;
            if (orderA !== orderB) return orderA - orderB;
            
 // 2차: 급여 유형 (호봉제 → 연봉제)
            if (a.isRankBased !== b.isRankBased) {
                return a.isRankBased ? -1 : 1;
            }
            
 // 3차: 호봉 (높은 순)
            if (a.isRankBased && b.isRankBased && a.currentRank && b.currentRank) {
                if (a.currentRank !== b.currentRank) {
                    return b.currentRank - a.currentRank;
                }
            }
            
 // 4차: 입사일 (빠른 순)
            if (a.entryDate && b.entryDate) {
                return new Date(a.entryDate) - new Date(b.entryDate);
            }
            
            return 0;
        });
    });
    
 // 부서 순서 정렬 (가나다순)
    const sortedDeptNames = Object.keys(hierarchy.departments).sort((a, b) => a.localeCompare(b, 'ko'));
    const sortedDepartments = {};
    sortedDeptNames.forEach(name => {
        sortedDepartments[name] = hierarchy.departments[name];
    });
    hierarchy.departments = sortedDepartments;
    
    return hierarchy;
}

// ===== 표 형식 조직도 =====

/**
 * 표 형식 조직도 HTML 생성
 * 
 * @param {Object} hierarchy - 계층 구조 데이터
 * @param {string} baseDateStr - 기준일 문자열
 * @param {boolean} includeMaternity - 육아휴직자 포함 여부
 * @param {boolean} showRoleInRemark - 비고란에 역할 표시 여부
 * @returns {string} HTML 문자열
 */
function generateTableOrgChart(hierarchy, baseDateStr, includeMaternity, showRoleInRemark = true) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str);
    
    let html = `
        <div id="org-chart-print-area">
            <h3 style="text-align:center;margin-bottom:8px;">조 직 도</h3>
            <p style="text-align:center;color:#6b7280;margin-bottom:24px;">
                기준일: ${baseDateStr} ${includeMaternity ? '' : '(육아휴직자 제외)'}
            </p>
            
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f3f4f6;">
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">부서</th>
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">직위</th>
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">성명</th>
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">직급</th>
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">호봉</th>
                        <th style="padding:12px;border:1px solid #d1d5db;text-align:center;font-weight:600;">비고</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
 // 기관장
    if (hierarchy.director) {
        const emp = hierarchy.director;
        const remark = showRoleInRemark ? '기관장' : '';
        html += `
            <tr style="background:#FFF2CC;">
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;font-weight:600;">-</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.position)}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;font-weight:600;">${escapeHtml(emp.name)}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.grade || '-')}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${emp.currentRank ? emp.currentRank + '호봉' : '-'}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${remark}</td>
            </tr>
        `;
    }
    
 // 부기관장
    if (hierarchy.viceDirector) {
        const emp = hierarchy.viceDirector;
        const remark = showRoleInRemark ? '부기관장' : '';
        html += `
            <tr style="background:#FFE6CC;">
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;font-weight:600;">-</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.position)}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;font-weight:600;">${escapeHtml(emp.name)}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.grade || '-')}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${emp.currentRank ? emp.currentRank + '호봉' : '-'}</td>
                <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${remark}</td>
            </tr>
        `;
    }
    
 // 부서별
    Object.values(hierarchy.departments).forEach(dept => {
        const allMembers = [];
        
 // 부서장
        if (dept.head) {
            allMembers.push({ ...dept.head, isDeptHead: true });
        }
        
 // 겸직/직무대리 부서장 (부서장과 별도로 추가)
        if (dept.concurrentHead) {
 // concurrentHead에 이미 isConcurrent, isActing 등의 속성이 있음
            allMembers.push({ ...dept.concurrentHead, isDeptHead: true });
        }
        
 // 팀원
        allMembers.push(...dept.members);
        
            allMembers.forEach((emp, index) => {
            const bgColor = emp.isDeptHead ? '#D9EAD3' : '#ffffff';
            
 // 비고 표시
            let remark = '';
            if (emp.isActing) {
                remark = '직무대리';
            } else if (emp.isConcurrent) {
                remark = '겸직';
            } else if (emp.isDeptHead && showRoleInRemark) {
                remark = '부서장';
            }
            
            const maternityMark = isOnMaternityLeave(emp, new Date(baseDateStr)) ? ' (육아휴직)' : '';
            
            html += `
                <tr style="background:${bgColor};">
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;${index === 0 ? 'font-weight:600;' : ''}">
                        ${index === 0 ? escapeHtml(dept.name) : ''}
                    </td>
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.position)}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;${emp.isDeptHead ? 'font-weight:600;' : ''}">${escapeHtml(emp.name)}${maternityMark}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(emp.grade || '-')}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${emp.currentRank ? emp.currentRank + '호봉' : '-'}</td>
                    <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${remark}</td>
                </tr>
            `;
        });
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

// ===== 계층형 조직도 =====

/**
 * 계층형 조직도 HTML 생성
 * 
 * @param {Object} hierarchy - 계층 구조 데이터
 * @param {string} baseDateStr - 기준일 문자열
 * @param {boolean} includeMaternity - 육아휴직자 포함 여부
 * @param {boolean} showRoleInRemark - 비고란에 역할 표시 여부
 * @returns {string} HTML 문자열
 */
function generateHierarchyOrgChart(hierarchy, baseDateStr, includeMaternity, showRoleInRemark = true) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str);
    
    const deptCount = Object.keys(hierarchy.departments).length;
    
    let html = `
        <div id="org-chart-print-area">
            <h3 style="text-align:center;margin-bottom:8px;">조 직 도</h3>
            <p style="text-align:center;color:#6b7280;margin-bottom:24px;">
                기준일: ${baseDateStr} ${includeMaternity ? '' : '(육아휴직자 제외)'}
            </p>
            
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
    `;
    
 // 기관장
    if (hierarchy.director) {
        const remark = showRoleInRemark ? '기관장' : '';
        html += generateOrgChartCard(hierarchy.director, '#FFF2CC', remark);
        html += `<div style="width:2px;height:20px;background:#999;"></div>`;
    }
    
 // 부기관장
    if (hierarchy.viceDirector) {
        const remark = showRoleInRemark ? '부기관장' : '';
        html += generateOrgChartCard(hierarchy.viceDirector, '#FFE6CC', remark);
        html += `<div style="width:2px;height:20px;background:#999;"></div>`;
    }
    
 // 부서들 (가로 배치)
    if (deptCount > 0) {
        html += `
            <div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;width:100%;">
        `;
        
        Object.values(hierarchy.departments).forEach(dept => {
            html += `
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:150px;">
                    <!-- 부서명 -->
                    <div style="padding:8px 12px;background:#f3f4f6;border-radius:6px;font-weight:600;text-align:center;width:130px;box-sizing:border-box;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${escapeHtml(dept.name)}
                    </div>
                    <div style="width:2px;height:12px;background:#999;"></div>
            `;
            
 // 부서장 (비고 없이 표시, 육아휴직만 표시)
            if (dept.head) {
                const maternityMark = isOnMaternityLeave(dept.head, new Date(baseDateStr)) ? '(육아휴직)' : '';
                html += generateOrgChartCard(dept.head, '#D9EAD3', maternityMark);
                
                if (dept.concurrentHead || dept.members.length > 0) {
                    html += `<div style="width:2px;height:12px;background:#999;"></div>`;
                }
            }
            
 // 겸직/직무대리 (부서장과 별도로 표시)
            if (dept.concurrentHead) {
                let concurrentRemark = '';
                if (dept.concurrentHead.isActing) {
                    concurrentRemark = '(직무대리)';
                } else if (dept.concurrentHead.isConcurrent) {
                    concurrentRemark = '(겸직)';
                }
                html += generateOrgChartCard(dept.concurrentHead, '#D9EAD3', concurrentRemark);
                
                if (dept.members.length > 0) {
                    html += `<div style="width:2px;height:12px;background:#999;"></div>`;
                }
            }
            
 // 팀원들
            dept.members.forEach((member, idx) => {
                const maternityMark = isOnMaternityLeave(member, new Date(baseDateStr)) ? '(육아휴직)' : '';
                html += generateOrgChartCard(member, '#D0E0E3', maternityMark);
                
                if (idx < dept.members.length - 1) {
                    html += `<div style="width:2px;height:8px;background:#ccc;"></div>`;
                }
            });
            
            html += `</div>`;
        });
        
        html += `</div>`;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * 조직도 카드 HTML 생성
 * 
 * @param {Object} emp - 직원 정보
 * @param {string} bgColor - 배경색
 * @param {string} remark - 비고
 * @returns {string} HTML 문자열
 */
function generateOrgChartCard(emp, bgColor, remark) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str);
    
    return `
        <div style="padding:12px 16px;background:${bgColor};border:1px solid #d1d5db;border-radius:8px;text-align:center;width:130px;min-height:60px;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;">
            <div style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(emp.position)}</div>
            <div style="font-weight:600;margin:4px 0;font-size:14px;">${escapeHtml(emp.name)}</div>
            <div style="font-size:10px;color:#9ca3af;min-height:14px;">${remark ? escapeHtml(remark) : ''}</div>
        </div>
    `;
}

// ===== 인원 현황표 =====

/**
 * 인원 현황표 HTML 생성
 * 
 * @param {Array<Object>} employees - 직원 목록
 * @param {Object} settings - 조직도 설정 (직위 순서 포함)
 * @returns {string} HTML 문자열
 */
function generatePersonnelStats(employees, settings) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str);
    
 // 직종별 집계
    const jobTypeCounts = { '계': employees.length };
    employees.forEach(emp => {
        if (emp.jobType) {
            jobTypeCounts[emp.jobType] = (jobTypeCounts[emp.jobType] || 0) + 1;
        }
    });
    
 // 직위별 집계
    const positionCounts = { '계': employees.length };
    employees.forEach(emp => {
        if (emp.position) {
            positionCounts[emp.position] = (positionCounts[emp.position] || 0) + 1;
        }
    });
    
 // 직종별 정렬: 인원수 많은 순 → 동일하면 가나다순
    const jobTypes = Object.keys(jobTypeCounts)
        .filter(k => k !== '계')
        .sort((a, b) => {
            const countDiff = (jobTypeCounts[b] || 0) - (jobTypeCounts[a] || 0);
            if (countDiff !== 0) return countDiff;
            return a.localeCompare(b, 'ko');
        });
    
 // 직위별 정렬: 조직도 우선순위 → 동일하면 인원수 많은 순 → 동일하면 가나다순
    const positionOrderMap = new Map();
    if (settings && settings.positionSettings) {
        settings.positionSettings.forEach(p => {
            positionOrderMap.set(p.name, p.order);
        });
    }
    
    const positions = Object.keys(positionCounts)
        .filter(k => k !== '계')
        .sort((a, b) => {
 // 1차: 조직도 우선순위 (낮은 순서가 먼저)
            const orderA = positionOrderMap.get(a) ?? 999;
            const orderB = positionOrderMap.get(b) ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            
 // 2차: 인원수 많은 순
            const countDiff = (positionCounts[b] || 0) - (positionCounts[a] || 0);
            if (countDiff !== 0) return countDiff;
            
 // 3차: 가나다순
            return a.localeCompare(b, 'ko');
        });
    
    let html = `
        <div style="margin-top:32px;">
            <h4 style="font-size:15px;font-weight:600;margin-bottom:12px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 인원 현황</h4>
            
            <!-- 직종별 -->
            <div style="margin-bottom:20px;">
                <p style="font-weight:500;margin-bottom:8px;">직종별</p>
                <table style="border-collapse:collapse;">
                    <tr style="background:#f3f4f6;">
                        <th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">구분</th>
                        <th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">계</th>
                        ${jobTypes.map(jt => `<th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(jt)}</th>`).join('')}
                    </tr>
                    <tr>
                        <td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">인원</td>
                        <td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;font-weight:600;">${jobTypeCounts['계']}</td>
                        ${jobTypes.map(jt => `<td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">${jobTypeCounts[jt] || 0}</td>`).join('')}
                    </tr>
                </table>
            </div>
            
            <!-- 직위별 -->
            <div>
                <p style="font-weight:500;margin-bottom:8px;">직위별</p>
                <table style="border-collapse:collapse;">
                    <tr style="background:#f3f4f6;">
                        <th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">구분</th>
                        <th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">계</th>
                        ${positions.map(pos => 
                            `<th style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">${escapeHtml(pos)}</th>`
                        ).join('')}
                    </tr>
                    <tr>
                        <td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">인원</td>
                        <td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;font-weight:600;">${positionCounts['계']}</td>
                        ${positions.map(pos => 
                            `<td style="padding:8px 16px;border:1px solid #d1d5db;text-align:center;">${positionCounts[pos] || 0}</td>`
                        ).join('')}
                    </tr>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

// ===== 인쇄 / 다운로드 =====

// ===== 인쇄 옵션 모달 =====

/**
 * 인쇄 옵션 모달 표시
 */
function showPrintOptions() {
    const modal = document.getElementById('print-options-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * 인쇄 옵션 모달 닫기
 */
function closePrintOptions() {
    const modal = document.getElementById('print-options-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 인쇄 실행 (모달에서 호출)
 */
function executePrint() {
    const orientation = document.querySelector('input[name="print-orientation"]:checked')?.value || 'portrait';
    const includeStats = document.getElementById('print-include-stats')?.checked ?? true;
    
    closePrintOptions();
    printOrgChart(orientation, includeStats);
}

/**
 * 조직도 인쇄
 * 
 * @param {string} orientation - 페이지 방향 ('portrait' 또는 'landscape')
 * @param {boolean} includeStats - 인원 현황 포함 여부
 */
function printOrgChart(orientation, includeStats = true) {
    try {
        const printArea = document.getElementById('org-chart-print-area');
        const statsArea = document.getElementById('org-chart-stats');
        
        if (!printArea) {
            alert('인쇄할 조직도가 없습니다. 먼저 조직도를 생성해주세요.');
            return;
        }
        
        const pageStyle = orientation === 'landscape' 
            ? '@page { size: landscape; margin: 10mm; }' 
            : '@page { size: portrait; margin: 10mm; }';
        
 // 인원현황표 HTML (옵션에 따라 포함)
        const statsHTML = (includeStats && statsArea) ? statsArea.innerHTML : '';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>조직도 인쇄</title>
                <style>
                    ${pageStyle}
                    body {
                        font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
                        margin: 0;
                        padding: 20px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    th, td {
                        border: 1px solid #333;
                        padding: 8px;
                        text-align: center;
                    }
                    th {
                        background-color: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    tr[style*="FFF2CC"], tr[style*="fff2cc"] { background-color: #FFF2CC !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    tr[style*="FFE6CC"], tr[style*="ffe6cc"] { background-color: #FFE6CC !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    tr[style*="D9EAD3"], tr[style*="d9ead3"] { background-color: #D9EAD3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    h3 { margin-bottom: 10px; }
                    h4 { margin-top: 30px; margin-bottom: 10px; }
                    p { color: #666; }
                    .stats-section { margin-top: 40px; }
                    
 /* 인쇄 버튼 */
                    .no-print { 
                        position: fixed; top: 20px; right: 20px; 
                        background: #2196F3; color: white; 
                        padding: 12px 24px; border: none; border-radius: 5px;
                        font-size: 14px; cursor: pointer; z-index: 9999;
                    }
                    .no-print:hover { background: #1976D2; }
                    
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            padding: 0;
                        }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> 인쇄하기 (Ctrl+P)</button>
                ${printArea.innerHTML}
                
                ${statsHTML ? `<div class="stats-section">${statsHTML}</div>` : ''}
            </body>
            </html>
        `;
        
 // Electron 환경에서 시스템 브라우저로 열기
        if (window.electronAPI && window.electronAPI.openInBrowser) {
            window.electronAPI.openInBrowser(htmlContent, 'orgchart_print.html');
        } else {
 // 웹 환경 폴백: 새 창에서 열기
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
            } else {
                alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
            }
        }
        
    } catch (error) {
        console.error('[조직도] 인쇄 오류:', error);
        alert('인쇄 중 오류가 발생했습니다.');
    }
}

/**
 * 조직도 엑셀 다운로드
 */
function downloadOrgChartExcel() {
    try {
        if (!currentOrgChartData) {
            alert('먼저 조직도를 생성해주세요.');
            return;
        }
        
        if (typeof XLSX === 'undefined') {
            alert('엑셀 라이브러리를 찾을 수 없습니다.');
            return;
        }
        
        const { hierarchy, employees, baseDate } = currentOrgChartData;
        
 // 데이터 배열 생성
        const data = [
            ['조직도'],
            [`기준일: ${baseDate}`],
            [],
            ['부서', '직위', '성명', '직급', '호봉', '비고']
        ];
        
 // 기관장
        if (hierarchy.director) {
            const emp = hierarchy.director;
            data.push([
                '-',
                emp.position,
                emp.name,
                emp.grade || '-',
                emp.currentRank ? emp.currentRank + '호봉' : '-',
                '기관장'
            ]);
        }
        
 // 부기관장
        if (hierarchy.viceDirector) {
            const emp = hierarchy.viceDirector;
            data.push([
                '-',
                emp.position,
                emp.name,
                emp.grade || '-',
                emp.currentRank ? emp.currentRank + '호봉' : '-',
                '부기관장'
            ]);
        }
        
 // 부서별
        Object.values(hierarchy.departments).forEach(dept => {
            const allMembers = [];
            
            if (dept.head) {
                allMembers.push({ ...dept.head, isDeptHead: true });
            }
            if (dept.concurrentHead && !dept.head) {
                allMembers.push({ ...dept.concurrentHead, isDeptHead: true, isConcurrent: true });
            }
            allMembers.push(...dept.members);
            
            allMembers.forEach((emp, index) => {
                const remark = emp.isConcurrent ? '겸직' : (emp.isDeptHead ? '부서장' : '');
                data.push([
                    index === 0 ? dept.name : '',
                    emp.position,
                    emp.name,
                    emp.grade || '-',
                    emp.currentRank ? emp.currentRank + '호봉' : '-',
                    remark
                ]);
            });
        });
        
 // 빈 행 추가
        data.push([]);
        data.push([]);
        
 // 인원 현황 (직종별)
        const jobTypeCounts = { '계': employees.length };
        employees.forEach(emp => {
            if (emp.jobType) {
                jobTypeCounts[emp.jobType] = (jobTypeCounts[emp.jobType] || 0) + 1;
            }
        });
        
        const jobTypes = Object.keys(jobTypeCounts).filter(k => k !== '계').sort((a, b) => a.localeCompare(b, 'ko'));
        data.push(['[직종별 현황]']);
        data.push(['구분', '계', ...jobTypes]);
        data.push(['인원', jobTypeCounts['계'], ...jobTypes.map(jt => jobTypeCounts[jt] || 0)]);
        
 // 빈 행
        data.push([]);
        
 // 인원 현황 (직위별)
        const positionCounts = { '계': employees.length };
        employees.forEach(emp => {
            if (emp.position) {
                positionCounts[emp.position] = (positionCounts[emp.position] || 0) + 1;
            }
        });
        
        const positions = Object.keys(positionCounts).filter(k => k !== '계').sort((a, b) => a.localeCompare(b, 'ko'));
        data.push(['[직위별 현황]']);
        data.push(['구분', '계', ...positions]);
        data.push(['인원', positionCounts['계'], ...positions.map(pos => positionCounts[pos] || 0)]);
        
 // 워크시트 생성
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '조직도');
        
 // 다운로드
        const fileName = `조직도_${baseDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        로거_인사?.info('조직도 엑셀 다운로드 완료', { fileName });
        
    } catch (error) {
        console.error('[조직도] 엑셀 다운로드 오류:', error);
        로거_인사?.error('엑셀 다운로드 오류', error);
        alert('엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

// ===== 초기화 =====

console.log(' 조직도_인사.js 로드 완료 (v6.0.2 - 브라우저 인쇄)');
