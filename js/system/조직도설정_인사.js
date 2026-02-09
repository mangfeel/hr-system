/**
 * 조직도설정_인사.js - 조직도 설정 관리
 * 
 * 직위 순서 및 부서 통합 설정
 * - 직위 순서 설정 (역할: 기관장/부기관장/부서장/팀원)
 * - 부서 통합 표시 설정
 * - 발령 데이터에서 직위/부서 자동 추출
 * - localStorage 저장/수정
 * 
 * @version 1.0.0
 * @since 2025-11-27
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 * - DOM유틸_인사.js (DOM유틸_인사)
 */

// ===== 상수 정의 =====

/**
 * 역할 구분 옵션
 * @constant {Array<Object>}
 */
const ORG_CHART_ROLES = [
    { id: 'director', label: '기관장', order: 1 },
    { id: 'viceDirector', label: '부기관장', order: 2 },
    { id: 'deptHead', label: '부서장', order: 3 },
    { id: 'staff', label: '팀원', order: 4 }
];

/**
 * 조직도 설정 저장 키
 * @constant {string}
 */
const ORG_CHART_SETTINGS_KEY = 'hr_org_chart_settings';

// ===== 데이터 추출 함수 =====

/**
 * 발령 데이터에서 모든 직위 목록 추출
 * 
 * @returns {Array<string>} 중복 제거된 직위 목록
 */
function extractPositionsFromAssignments() {
    try {
        로거_인사?.debug('발령 데이터에서 직위 추출 시작');
        
        const employees = db.getEmployees();
        const positionSet = new Set();
        
        employees.forEach(emp => {
 // 현재 직위 (currentPosition.position)
            if (emp.currentPosition?.position) {
                positionSet.add(emp.currentPosition.position);
            }
            
 // 레거시: emp.position (하위 호환)
            if (emp.position) {
                positionSet.add(emp.position);
            }
            
 // 발령 이력의 직위
            if (emp.assignments && Array.isArray(emp.assignments)) {
                emp.assignments.forEach(assign => {
                    if (assign.position) {
                        positionSet.add(assign.position);
                    }
                });
            }
        });
        
        const positions = Array.from(positionSet).sort((a, b) => a.localeCompare(b, 'ko'));
        
        console.log('[조직도설정] 추출된 직위:', positions);
        로거_인사?.info('직위 추출 완료', { count: positions.length });
        return positions;
        
    } catch (error) {
        console.error('[조직도설정] 직위 추출 오류:', error);
        로거_인사?.error('직위 추출 오류', error);
        return [];
    }
}

/**
 * 발령 데이터에서 모든 부서 목록 추출
 * 
 * @returns {Array<string>} 중복 제거된 부서 목록
 */
function extractDepartmentsFromAssignments() {
    try {
        로거_인사?.debug('발령 데이터에서 부서 추출 시작');
        
        const employees = db.getEmployees();
        console.log('[조직도설정] 직원 수:', employees.length);
        
        const deptSet = new Set();
        
        employees.forEach(emp => {
 // 현재 부서 (currentPosition.dept)
            if (emp.currentPosition?.dept) {
                deptSet.add(emp.currentPosition.dept);
            }
            
 // 레거시: emp.department (하위 호환)
            if (emp.department) {
                deptSet.add(emp.department);
            }
            
 // 발령 이력의 부서
            if (emp.assignments && Array.isArray(emp.assignments)) {
                emp.assignments.forEach(assign => {
 // assign.dept 또는 assign.department
                    if (assign.dept) {
                        deptSet.add(assign.dept);
                    }
                    if (assign.department) {
                        deptSet.add(assign.department);
                    }
                });
            }
        });
        
        const departments = Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'ko'));
        
        console.log('[조직도설정] 추출된 부서:', departments);
        로거_인사?.info('부서 추출 완료', { count: departments.length });
        return departments;
        
    } catch (error) {
        console.error('[조직도설정] 부서 추출 오류:', error);
        로거_인사?.error('부서 추출 오류', error);
        return [];
    }
}

// ===== 설정 저장/로드 =====

/**
 * 조직도 설정 로드
 * 
 * @returns {Object} 조직도 설정 객체
 */
function loadOrgChartSettings() {
    try {
        const saved = localStorage.getItem(ORG_CHART_SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
 // 기본값 보장
            if (settings.showRoleInRemark === undefined) {
                settings.showRoleInRemark = true;  // 기본값: 표시
            }
            return settings;
        }
        
 // 기본값 반환
        return {
            positionSettings: [],   // 직위 순서 설정
            departmentMerge: [],    // 부서 통합 설정
            showRoleInRemark: true  // 비고란 역할 표시 (기관장/부기관장/부서장)
        };
        
    } catch (error) {
        console.error('[조직도설정] 설정 로드 오류:', error);
        로거_인사?.error('설정 로드 오류', error);
        return {
            positionSettings: [],
            departmentMerge: [],
            showRoleInRemark: true
        };
    }
}

/**
 * 조직도 설정 저장
 * 
 * @param {Object} settings - 저장할 설정 객체
 * @returns {boolean} 저장 성공 여부
 */
function saveOrgChartSettings(settings) {
    try {
        localStorage.setItem(ORG_CHART_SETTINGS_KEY, JSON.stringify(settings));
        로거_인사?.info('조직도 설정 저장 완료');
        return true;
        
    } catch (error) {
        console.error('[조직도설정] 설정 저장 오류:', error);
        로거_인사?.error('설정 저장 오류', error);
        return false;
    }
}

/**
 * 직위 설정 가져오기 (순서 포함)
 * 
 * @param {string} position - 직위명
 * @returns {Object|null} 직위 설정 객체 또는 null
 */
function getPositionSetting(position) {
    const settings = loadOrgChartSettings();
    return settings.positionSettings.find(p => p.name === position) || null;
}

/**
 * 부서 통합 설정 가져오기
 * 
 * @param {string} department - 부서명
 * @returns {string|null} 통합 대상 부서명 또는 null
 */
function getMergedDepartment(department) {
    const settings = loadOrgChartSettings();
    const merge = settings.departmentMerge.find(m => m.source === department);
    return merge ? merge.target : null;
}

// ===== UI 생성 =====

/**
 * 조직도 설정 화면 로드
 */
function loadOrgChartSettingsModule() {
    try {
        로거_인사?.debug('조직도 설정 화면 로드');
        console.log('[조직도설정] 화면 로드 시작');
        
        const container = document.getElementById('module-org-chart-settings');
        if (!container) {
            console.error('[조직도설정] 컨테이너를 찾을 수 없음');
            return;
        }
        
 // 데이터 추출
        const positions = extractPositionsFromAssignments();
        const departments = extractDepartmentsFromAssignments();
        const settings = loadOrgChartSettings();
        
        console.log('[조직도설정] 데이터 추출 결과:', {
            positions: positions,
            positionCount: positions.length,
            departments: departments,
            departmentCount: departments.length
        });
        
 // 직위 설정 병합 (기존 설정 + 새로 추출된 직위)
        const mergedPositionSettings = mergePositionSettings(positions, settings.positionSettings);
        
 // HTML 생성 (settings 전체 전달)
        container.innerHTML = generateOrgChartSettingsHTML(mergedPositionSettings, departments, settings);
        
        로거_인사?.info('조직도 설정 화면 로드 완료');
        
    } catch (error) {
        console.error('[조직도설정] 화면 로드 오류:', error);
        로거_인사?.error('화면 로드 오류', error);
        에러처리_인사?.handle(error, '조직도 설정 화면을 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 직위 설정 병합 (기존 설정 유지 + 새 직위 추가)
 * 
 * @param {Array<string>} positions - 추출된 직위 목록
 * @param {Array<Object>} savedSettings - 저장된 직위 설정
 * @returns {Array<Object>} 병합된 직위 설정
 */
function mergePositionSettings(positions, savedSettings) {
    const result = [];
    const savedMap = new Map(savedSettings.map(s => [s.name, s]));
    
    positions.forEach((pos, index) => {
        if (savedMap.has(pos)) {
            result.push(savedMap.get(pos));
        } else {
 // 새 직위 - 기본값으로 추가
            result.push({
                name: pos,
                order: index + 1,
                role: 'staff'  // 기본값: 팀원
            });
        }
    });
    
 // 순서대로 정렬
    result.sort((a, b) => a.order - b.order);
    
    return result;
}

/**
 * 조직도 설정 HTML 생성
 * 
 * @param {Array<Object>} positionSettings - 직위 설정 목록
 * @param {Array<string>} departments - 부서 목록
 * @param {Object} settings - 전체 설정 객체
 * @returns {string} HTML 문자열
 */
function generateOrgChartSettingsHTML(positionSettings, departments, settings) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => str;
    
 // 설정값 추출
    const departmentMerge = settings.departmentMerge || [];
    const showRoleInRemark = settings.showRoleInRemark !== false;  // 기본값 true
    
 // 역할 옵션 HTML
    const roleOptionsHTML = ORG_CHART_ROLES.map(role => 
        `<option value="${role.id}">${role.label}</option>`
    ).join('');
    
 // 직위 설정 행 HTML
    const positionRowsHTML = positionSettings.map((pos, index) => {
        const roleOptions = ORG_CHART_ROLES.map(role => 
            `<option value="${role.id}" ${pos.role === role.id ? 'selected' : ''}>${role.label}</option>`
        ).join('');
        
        return `
            <tr data-position="${escapeHtml(pos.name)}">
                <td style="padding:12px;border:1px solid #e5e7eb;font-weight:500;">
                    ${escapeHtml(pos.name)}
                </td>
                <td style="padding:12px;border:1px solid #e5e7eb;text-align:center;">
                    <input type="number" class="position-order-input" 
                           value="${pos.order}" min="1" max="99"
                           style="width:60px;padding:6px;border:1px solid #d1d5db;border-radius:4px;text-align:center;">
                </td>
                <td style="padding:12px;border:1px solid #e5e7eb;text-align:center;">
                    <select class="position-role-select" 
                            style="padding:6px 12px;border:1px solid #d1d5db;border-radius:4px;">
                        ${roleOptions}
                    </select>
                </td>
            </tr>
        `;
    }).join('');
    
 // 부서 옵션 HTML
    const deptOptionsHTML = departments.map(dept => 
        `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
    ).join('');
    
 // 부서 통합 행 HTML
    const mergeRowsHTML = departmentMerge.map((merge, index) => `
        <div class="merge-row" data-index="${index}" style="display:flex;gap:12px;align-items:center;margin-bottom:12px;padding:12px;background:#f9fafb;border-radius:8px;">
            <select class="merge-source" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                ${departments.map(dept => 
                    `<option value="${escapeHtml(dept)}" ${merge.source === dept ? 'selected' : ''}>${escapeHtml(dept)}</option>`
                ).join('')}
            </select>
            <span style="color:#6b7280;">→</span>
            <select class="merge-target" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                ${departments.map(dept => 
                    `<option value="${escapeHtml(dept)}" ${merge.target === dept ? 'selected' : ''}>${escapeHtml(dept)}</option>`
                ).join('')}
            </select>
            <span style="color:#6b7280;">에 포함</span>
            <button type="button" onclick="removeDeptMerge(${index})" 
                    style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;">
                삭제
            </button>
        </div>
    `).join('');
    
    return `
        <div class="card">
            <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> 조직도 설정</div>
            
            <div class="alert alert-info" style="margin-bottom:24px;">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>이 설정은 조직도 생성 시 사용됩니다. 한 번 설정하면 계속 사용되며, 언제든 수정할 수 있습니다.</span>
            </div>
            
            <!-- 직위 순서 설정 -->
            <div style="margin-bottom:32px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 직위 순서</h3>
                <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
                    조직도에서 직위가 표시되는 순서를 설정합니다. 순서 숫자가 작을수록 위에 표시됩니다.
                </p>
                
                ${positionSettings.length > 0 ? `
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f3f4f6;">
                                    <th style="padding:12px;border:1px solid #e5e7eb;text-align:left;font-weight:600;">직위명</th>
                                    <th style="padding:12px;border:1px solid #e5e7eb;text-align:center;font-weight:600;width:100px;">순서</th>
                                    <th style="padding:12px;border:1px solid #e5e7eb;text-align:center;font-weight:600;width:150px;">역할</th>
                                </tr>
                            </thead>
                            <tbody id="position-settings-body">
                                ${positionRowsHTML}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="alert alert-warning">
                        <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                        <span>등록된 직원 또는 발령 데이터가 없습니다. 직원을 먼저 등록해주세요.</span>
                    </div>
                `}
            </div>
            
            <!-- 부서 통합 표시 설정 -->
            <div style="margin-bottom:32px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> 부서 통합 표시</h3>
                <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
                    일부 부서를 조직도에서 다른 부서에 포함하여 표시합니다. (예: 장애인활동지원사업 → 지역연계팀)
                </p>
                
                <div id="dept-merge-container">
                    ${mergeRowsHTML}
                </div>
                
                ${departments.length >= 2 ? `
                    <button type="button" onclick="addDeptMerge()" 
                            style="margin-top:12px;padding:8px 16px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:14px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 통합 추가
                    </button>
                ` : `
                    <div class="alert alert-warning" style="margin-top:12px;">
                        <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                        <span>부서가 2개 이상 있어야 통합 설정을 할 수 있습니다.</span>
                    </div>
                `}
            </div>
            
            <!-- 표시 옵션 설정 -->
            <div style="margin-bottom:32px;">
                <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> 표시 옵션</h3>
                <p style="color:#6b7280;font-size:13px;margin-bottom:16px;">
                    조직도에 표시되는 항목을 설정합니다.
                </p>
                
                <div style="padding:16px;background:#f9fafb;border-radius:8px;">
                    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="show-role-in-remark" 
                               ${showRoleInRemark ? 'checked' : ''}
                               style="width:18px;height:18px;cursor:pointer;">
                        <span style="font-weight:500;">비고란에 역할 표시</span>
                        <span style="color:#6b7280;font-size:13px;">(기관장, 부기관장, 부서장)</span>
                    </label>
                    <p style="margin:8px 0 0 28px;color:#6b7280;font-size:12px;">
                        체크 해제 시 겸직, 직무대리, 육아휴직만 표시됩니다.
                    </p>
                </div>
            </div>
            
            <!-- 저장 버튼 -->
            <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid #e5e7eb;">
                <button type="button" onclick="saveOrgChartSettingsFromUI()" class="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 저장
                </button>
            </div>
        </div>
        
        <!-- 숨겨진 데이터 (부서 목록) -->
        <script id="dept-list-data" type="application/json">${JSON.stringify(departments)}</script>
    `;
}

// ===== 부서 통합 관리 =====

/**
 * 부서 통합 추가
 */
function addDeptMerge() {
    try {
        const container = document.getElementById('dept-merge-container');
        const deptDataEl = document.getElementById('dept-list-data');
        
        if (!container || !deptDataEl) return;
        
        const departments = JSON.parse(deptDataEl.textContent);
        if (departments.length < 2) {
            alert('부서가 2개 이상 있어야 통합 설정을 할 수 있습니다.');
            return;
        }
        
        const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
            ? DOM유틸_인사.escapeHtml 
            : (str) => str;
        
        const index = container.querySelectorAll('.merge-row').length;
        
        const deptOptionsHTML = departments.map(dept => 
            `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
        ).join('');
        
        const newRow = document.createElement('div');
        newRow.className = 'merge-row';
        newRow.dataset.index = index;
        newRow.style.cssText = 'display:flex;gap:12px;align-items:center;margin-bottom:12px;padding:12px;background:#f9fafb;border-radius:8px;';
        newRow.innerHTML = `
            <select class="merge-source" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                ${deptOptionsHTML}
            </select>
            <span style="color:#6b7280;">→</span>
            <select class="merge-target" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
                ${deptOptionsHTML}
            </select>
            <span style="color:#6b7280;">에 포함</span>
            <button type="button" onclick="removeDeptMerge(${index})" 
                    style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;">
                삭제
            </button>
        `;
        
        container.appendChild(newRow);
        
    } catch (error) {
        console.error('[조직도설정] 부서 통합 추가 오류:', error);
    }
}

/**
 * 부서 통합 삭제
 * 
 * @param {number} index - 삭제할 행의 인덱스
 */
function removeDeptMerge(index) {
    try {
        const container = document.getElementById('dept-merge-container');
        const row = container.querySelector(`.merge-row[data-index="${index}"]`);
        
        if (row) {
            row.remove();
        }
        
    } catch (error) {
        console.error('[조직도설정] 부서 통합 삭제 오류:', error);
    }
}

// ===== 설정 저장 =====

/**
 * UI에서 설정 수집 후 저장
 */
function saveOrgChartSettingsFromUI() {
    try {
        로거_인사?.debug('조직도 설정 저장 시작');
        
 // 직위 설정 수집
        const positionSettings = [];
        const positionRows = document.querySelectorAll('#position-settings-body tr');
        
        positionRows.forEach(row => {
            const name = row.dataset.position;
            const order = parseInt(row.querySelector('.position-order-input').value) || 99;
            const role = row.querySelector('.position-role-select').value;
            
            positionSettings.push({ name, order, role });
        });
        
 // 순서대로 정렬
        positionSettings.sort((a, b) => a.order - b.order);
        
 // 부서 통합 설정 수집
        const departmentMerge = [];
        const mergeRows = document.querySelectorAll('#dept-merge-container .merge-row');
        
        mergeRows.forEach(row => {
            const source = row.querySelector('.merge-source').value;
            const target = row.querySelector('.merge-target').value;
            
            if (source && target && source !== target) {
                departmentMerge.push({ source, target });
            }
        });
        
 // 중복 확인 (같은 source가 여러 개 있으면 안 됨)
        const sourceSet = new Set();
        for (const merge of departmentMerge) {
            if (sourceSet.has(merge.source)) {
                alert(`'${merge.source}' 부서가 중복으로 설정되어 있습니다.\n하나의 부서는 하나의 부서에만 통합할 수 있습니다.`);
                return;
            }
            sourceSet.add(merge.source);
        }
        
 // 표시 옵션 수집
        const showRoleInRemark = document.getElementById('show-role-in-remark')?.checked ?? true;
        
 // 저장
        const settings = {
            positionSettings,
            departmentMerge,
            showRoleInRemark,
            lastUpdated: new Date().toISOString()
        };
        
        if (saveOrgChartSettings(settings)) {
            에러처리_인사?.success('조직도 설정이 저장되었습니다.');
            로거_인사?.info('조직도 설정 저장 완료', {
                positionCount: positionSettings.length,
                mergeCount: departmentMerge.length,
                showRoleInRemark
            });
        } else {
            throw new Error('설정 저장 실패');
        }
        
    } catch (error) {
        console.error('[조직도설정] 설정 저장 오류:', error);
        로거_인사?.error('설정 저장 오류', error);
        에러처리_인사?.handle(error, '설정 저장 중 오류가 발생했습니다.');
    }
}

// ===== 외부에서 사용할 유틸리티 함수 =====

/**
 * 직위별 정렬 비교 함수 반환
 * 
 * @returns {Function} 정렬 비교 함수
 */
function getPositionComparator() {
    const settings = loadOrgChartSettings();
    const positionMap = new Map(settings.positionSettings.map(p => [p.name, p.order]));
    
    return (posA, posB) => {
        const orderA = positionMap.get(posA) || 999;
        const orderB = positionMap.get(posB) || 999;
        return orderA - orderB;
    };
}

/**
 * 직위의 역할 가져오기
 * 
 * @param {string} position - 직위명
 * @returns {string} 역할 ID (director/viceDirector/deptHead/staff)
 */
function getPositionRole(position) {
    const settings = loadOrgChartSettings();
    const positionSetting = settings.positionSettings.find(p => p.name === position);
    return positionSetting ? positionSetting.role : 'staff';
}

/**
 * 부서 통합 적용하여 실제 표시할 부서 반환
 * 
 * @param {string} department - 원래 부서명
 * @returns {string} 표시할 부서명
 */
function getDisplayDepartment(department) {
    const merged = getMergedDepartment(department);
    return merged || department;
}

/**
 * 모든 부서 통합 설정 가져오기
 * 
 * @returns {Array<Object>} 부서 통합 설정 배열
 */
function getAllDepartmentMerges() {
    const settings = loadOrgChartSettings();
    return settings.departmentMerge || [];
}

// ===== 초기화 =====

// 모듈 로드 시 로그
console.log(' 조직도설정_인사.js 로드 완료');
