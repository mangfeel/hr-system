/**
 * 겸직관리_인사.js - 겸직 및 직무대리 관리
 * 
 * 겸직/직무대리 등록, 조회, 수정, 삭제
 * - 기간 기반 관리 (시작일 ~ 종료일)
 * - 조직도 생성 시 기준일에 따라 자동 반영
 * - 유형: 겸직(concurrent), 직무대리(acting)
 * 
 * @version 1.0.2
 * @since 2025-11-27
 * 
 * [변경 이력]
 * v1.0.2 - 2026-02-03: 등록 현황 테이블 담당 직원 이름 표시 버그 수정
 * - employee.name → employee.personalInfo?.name 으로 수정
 * v1.0.1 - 2026-01-05: 겸직관리_인사 네임스페이스 추가 (급여계산기 연동)
 * v1.0.0 - 2025-11-27: 최초 작성
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 호봉계산기_인사.js (DateUtils)
 * - DOM유틸_인사.js (DOM유틸_인사)
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 */

// ===== 상수 정의 =====

/**
 * 겸직/직무대리 저장 키
 * @constant {string}
 */
const CONCURRENT_POSITION_KEY = 'hr_concurrent_positions';

/**
 * 유형 정의
 * @constant {Object}
 */
const POSITION_TYPES = {
    concurrent: { id: 'concurrent', label: '겸직', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', color: '#3b82f6' },
    acting: { id: 'acting', label: '직무대리', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>', color: '#f59e0b' }
};

// ===== 데이터 관리 =====

/**
 * 모든 겸직/직무대리 목록 로드
 * 
 * @returns {Array<Object>} 겸직/직무대리 목록
 */
function loadConcurrentPositions() {
    try {
        const saved = localStorage.getItem(CONCURRENT_POSITION_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    } catch (error) {
        console.error('[겸직관리] 데이터 로드 오류:', error);
        return [];
    }
}

/**
 * 겸직/직무대리 목록 저장
 * 
 * @param {Array<Object>} positions - 저장할 목록
 * @returns {boolean} 저장 성공 여부
 */
function saveConcurrentPositions(positions) {
    try {
        localStorage.setItem(CONCURRENT_POSITION_KEY, JSON.stringify(positions));
        로거_인사?.info('겸직/직무대리 저장 완료', { count: positions.length });
        return true;
    } catch (error) {
        console.error('[겸직관리] 데이터 저장 오류:', error);
        return false;
    }
}

/**
 * 특정 기준일에 유효한 겸직/직무대리 목록 조회
 * 
 * @param {string} baseDate - 기준일 (YYYY-MM-DD)
 * @returns {Array<Object>} 해당 날짜에 유효한 목록
 */
function getActiveConcurrentPositions(baseDate) {
    try {
        const positions = loadConcurrentPositions();
        
        return positions.filter(pos => {
 // 시작일 체크
            if (pos.startDate && pos.startDate > baseDate) {
                return false;
            }
            
 // 종료일 체크 (null이면 계속 유효)
            if (pos.endDate && pos.endDate < baseDate) {
                return false;
            }
            
            return true;
        });
        
    } catch (error) {
        console.error('[겸직관리] 유효 목록 조회 오류:', error);
        return [];
    }
}

/**
 * 특정 직원의 겸직/직무대리 조회
 * 
 * @param {string} employeeId - 직원 ID
 * @param {string} [baseDate] - 기준일 (YYYY-MM-DD), 생략 시 전체 목록
 * @returns {Array<Object>} 해당 직원의 겸직/직무대리 목록
 */
function getEmployeeConcurrentPositions(employeeId, baseDate) {
    try {
 // baseDate가 없으면 전체 목록에서 필터
        if (!baseDate) {
            const allPositions = loadConcurrentPositions();
            return allPositions.filter(pos => pos.employeeId === employeeId);
        }
        
 // baseDate가 있으면 유효한 목록에서 필터
        const activePositions = getActiveConcurrentPositions(baseDate);
        return activePositions.filter(pos => pos.employeeId === employeeId);
    } catch (error) {
        console.error('[겸직관리] 직원 겸직/직무대리 조회 오류:', error);
        return [];
    }
}

/**
 * 특정 부서의 겸직/직무대리 담당자 조회
 * 
 * @param {string} department - 부서명
 * @param {string} baseDate - 기준일 (YYYY-MM-DD)
 * @returns {Object|null} 해당 부서 담당 정보 또는 null
 */
function getDepartmentConcurrentHead(department, baseDate) {
    const activePositions = getActiveConcurrentPositions(baseDate);
    return activePositions.find(pos => pos.targetDept === department) || null;
}

/**
 * 겸직/직무대리 추가
 * 
 * @param {Object} position - 추가할 겸직/직무대리 정보
 * @returns {boolean} 추가 성공 여부
 */
function addConcurrentPositionRecord(position) {
    try {
        const positions = loadConcurrentPositions();
        
 // ID 생성
        position.id = 'CP' + Date.now();
        position.createdAt = new Date().toISOString();
        
 // 검증
        if (!position.employeeId || !position.targetDept || !position.type) {
            throw new Error('필수 항목이 누락되었습니다.');
        }
        
 // 중복 확인 (같은 부서에 같은 기간 다른 담당자)
        const conflict = positions.find(p => 
            p.targetDept === position.targetDept &&
            p.id !== position.id &&
            isDateRangeOverlap(p.startDate, p.endDate, position.startDate, position.endDate)
        );
        
        if (conflict) {
            throw new Error(`'${position.targetDept}' 부서에 이미 해당 기간에 겸직/직무대리가 지정되어 있습니다.`);
        }
        
        positions.push(position);
        
        return saveConcurrentPositions(positions);
        
    } catch (error) {
        console.error('[겸직관리] 추가 오류:', error);
        에러처리_인사?.handle(error, error.message);
        return false;
    }
}

/**
 * 겸직/직무대리 수정
 * 
 * @param {string} id - 수정할 레코드 ID
 * @param {Object} updates - 수정할 내용
 * @returns {boolean} 수정 성공 여부
 */
function updateConcurrentPositionRecord(id, updates) {
    try {
        const positions = loadConcurrentPositions();
        const index = positions.findIndex(p => p.id === id);
        
        if (index === -1) {
            throw new Error('해당 레코드를 찾을 수 없습니다.');
        }
        
 // 중복 확인 (수정 후 다른 레코드와 충돌 여부)
        const updatedPosition = { ...positions[index], ...updates };
        
        const conflict = positions.find(p => 
            p.targetDept === updatedPosition.targetDept &&
            p.id !== id &&
            isDateRangeOverlap(p.startDate, p.endDate, updatedPosition.startDate, updatedPosition.endDate)
        );
        
        if (conflict) {
            throw new Error(`'${updatedPosition.targetDept}' 부서에 이미 해당 기간에 겸직/직무대리가 지정되어 있습니다.`);
        }
        
        positions[index] = { ...positions[index], ...updates, updatedAt: new Date().toISOString() };
        
        return saveConcurrentPositions(positions);
        
    } catch (error) {
        console.error('[겸직관리] 수정 오류:', error);
        에러처리_인사?.handle(error, error.message);
        return false;
    }
}

/**
 * 겸직/직무대리 삭제
 * 
 * @param {string} id - 삭제할 레코드 ID
 * @returns {boolean} 삭제 성공 여부
 */
function deleteConcurrentPositionRecord(id) {
    try {
        const positions = loadConcurrentPositions();
        const filtered = positions.filter(p => p.id !== id);
        
        if (filtered.length === positions.length) {
            throw new Error('해당 레코드를 찾을 수 없습니다.');
        }
        
        return saveConcurrentPositions(filtered);
        
    } catch (error) {
        console.error('[겸직관리] 삭제 오류:', error);
        에러처리_인사?.handle(error, error.message);
        return false;
    }
}

// ===== 유틸리티 =====

/**
 * 기간 중복 확인
 * 
 * @param {string|null} start1 - 첫 번째 시작일
 * @param {string|null} end1 - 첫 번째 종료일
 * @param {string|null} start2 - 두 번째 시작일
 * @param {string|null} end2 - 두 번째 종료일
 * @returns {boolean} 중복 여부
 */
function isDateRangeOverlap(start1, end1, start2, end2) {
 // 시작일이 없으면 아주 오래 전부터
    const s1 = start1 || '1900-01-01';
    const s2 = start2 || '1900-01-01';
    
 // 종료일이 없으면 아주 먼 미래까지
    const e1 = end1 || '2999-12-31';
    const e2 = end2 || '2999-12-31';
    
 // 기간1의 종료일이 기간2의 시작일보다 이전이면 중복 없음
 // 기간1의 시작일이 기간2의 종료일보다 이후이면 중복 없음
    return !(e1 < s2 || s1 > e2);
}

/**
 * 직원 정보 가져오기
 * 
 * @param {string} employeeId - 직원 ID
 * @returns {Object|null} 직원 객체 또는 null
 */
function getEmployeeById(employeeId) {
    const employees = db.getEmployees();
    return employees.find(e => e.id === employeeId) || null;
}

/**
 * 발령 데이터에서 모든 부서 목록 추출 (겸직관리용)
 * 
 * @returns {Array<string>} 중복 제거된 부서 목록
 */
function extractDepartmentsForConcurrent() {
    try {
        const employees = db.getEmployees();
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
                    if (assign.dept) {
                        deptSet.add(assign.dept);
                    }
                    if (assign.department) {
                        deptSet.add(assign.department);
                    }
                });
            }
        });
        
        return Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'ko'));
        
    } catch (error) {
        console.error('[겸직관리] 부서 추출 오류:', error);
        return [];
    }
}

/**
 * 재직 중인 직원 목록 가져오기 (겸직관리용)
 * 
 * @returns {Array<Object>} 재직 직원 목록
 */
function getActiveEmployeesForConcurrent() {
    try {
        const employees = db.getEmployees();
        
        return employees.filter(emp => {
 // 퇴사일이 없거나 미래인 경우만
            if (emp.retireDate) return false;
            if (emp.employment?.retirementDate) return false;
            return true;
        });
        
    } catch (error) {
        console.error('[겸직관리] 재직자 추출 오류:', error);
        return [];
    }
}

// ===== UI 생성 =====

/**
 * 겸직/직무대리 관리 화면 로드
 */
function loadConcurrentPositionModule() {
    try {
        로거_인사?.debug('겸직/직무대리 관리 화면 로드');
        
        const container = document.getElementById('module-concurrent-position');
        if (!container) {
            console.error('[겸직관리] 컨테이너를 찾을 수 없음');
            return;
        }
        
 // 데이터 로드
        const positions = loadConcurrentPositions();
        const employees = getActiveEmployeesForConcurrent();
        const departments = extractDepartmentsForConcurrent();
        
        console.log('[겸직관리] 데이터 로드:', { 
            positionCount: positions.length, 
            employeeCount: employees.length, 
            deptCount: departments.length 
        });
        
 // HTML 생성
        container.innerHTML = generateConcurrentPositionHTML(positions, employees, departments);
        
        로거_인사?.info('겸직/직무대리 관리 화면 로드 완료');
        
    } catch (error) {
        console.error('[겸직관리] 화면 로드 오류:', error);
        에러처리_인사?.handle(error, '겸직/직무대리 관리 화면을 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 겸직/직무대리 관리 HTML 생성
 * 
 * @param {Array<Object>} positions - 겸직/직무대리 목록
 * @param {Array<Object>} employees - 직원 목록
 * @param {Array<string>} departments - 부서 목록
 * @returns {string} HTML 문자열
 */
function generateConcurrentPositionHTML(positions, employees, departments) {
    const escapeHtml = typeof DOM유틸_인사 !== 'undefined' 
        ? DOM유틸_인사.escapeHtml 
        : (str) => String(str || '');
    
    const today = DateUtils ? DateUtils.formatDate(new Date()) : new Date().toISOString().split('T')[0];
    
 // 직원 옵션 (이미 필터링된 재직자 목록)
    const empOptionsHTML = employees
        .sort((a, b) => (a.name || a.personalInfo?.name || '').localeCompare(b.name || b.personalInfo?.name || '', 'ko'))
        .map(emp => {
            const name = emp.name || emp.personalInfo?.name || '';
            const position = emp.position || emp.currentPosition?.position || '';
            const dept = emp.department || emp.currentPosition?.dept || '';
            return `<option value="${escapeHtml(emp.id)}">${escapeHtml(name)} (${escapeHtml(position)} - ${escapeHtml(dept)})</option>`;
        }).join('');
    
 // 부서 옵션
    const deptOptionsHTML = departments.map(dept => 
        `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`
    ).join('');
    
 // 목록 테이블 행 생성
    const tableRowsHTML = positions.length > 0 
        ? positions.map(pos => {
            const employee = getEmployeeById(pos.employeeId);
            const empName = employee ? (employee.personalInfo?.name || employee.name || '(이름없음)') : '(삭제된 직원)';
            const typeInfo = POSITION_TYPES[pos.type] || POSITION_TYPES.concurrent;
            
 // 현재 유효 여부 체크
            const isActive = (!pos.startDate || pos.startDate <= today) && 
                            (!pos.endDate || pos.endDate >= today);
            
            const statusBadge = isActive 
                ? '<span style="display:inline-block;padding:2px 8px;background:#dcfce7;color:#16a34a;border-radius:4px;font-size:12px;">유효</span>'
                : '<span style="display:inline-block;padding:2px 8px;background:#f3f4f6;color:#6b7280;border-radius:4px;font-size:12px;">종료</span>';
            
            return `
                <tr data-id="${escapeHtml(pos.id)}">
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
                        <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:${typeInfo.color}15;color:${typeInfo.color};border-radius:4px;font-size:13px;">
                            ${typeInfo.icon} ${typeInfo.label}
                        </span>
                    </td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-weight:500;">${escapeHtml(empName)}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(pos.targetDept)}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(pos.targetPosition || '부서장')}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(pos.startDate || '-')}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(pos.endDate || '계속')}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${statusBadge}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(pos.reason || '')}</td>
                    <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
                        <button type="button" onclick="editConcurrentPosition('${escapeHtml(pos.id)}')" 
                                style="padding:4px 8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;margin-right:4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button type="button" onclick="confirmDeleteConcurrentPosition('${escapeHtml(pos.id)}')" 
                                style="padding:4px 8px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;cursor:pointer;color:#dc2626;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('')
        : `
            <tr>
                <td colspan="9" style="padding:40px;text-align:center;color:#6b7280;">
                    등록된 겸직/직무대리가 없습니다.<br>
                    <span style="font-size:13px;">위의 양식을 사용하여 새로 등록해주세요.</span>
                </td>
            </tr>
        `;
    
    return `
        <div class="card">
            <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> 겸직/직무대리 관리</div>
            
            <!-- 안내 -->
            <div style="background:#eff6ff;padding:16px;border-radius:8px;margin-bottom:24px;">
                <p style="color:#1d4ed8;font-size:14px;margin:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> <strong>겸직</strong>: 다른 부서의 부서장 역할을 겸임<br>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> <strong>직무대리</strong>: 부서장 부재(육아휴직 등) 시 대리 역할 수행<br>
                    <span style="font-size:13px;color:#3b82f6;">조직도 생성 시 기준일에 따라 자동으로 반영됩니다.</span>
                </p>
            </div>
            
            <!-- 등록 폼 -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:24px;">
                <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 새 겸직/직무대리 등록</h3>
                
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;">
                    <!-- 유형 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">유형 *</label>
                        <select id="cp-type" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            <option value="acting">직무대리</option>
                            <option value="concurrent">겸직</option>
                        </select>
                    </div>
                    
                    <!-- 직원 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">담당 직원 *</label>
                        <select id="cp-employee" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            <option value="">선택하세요</option>
                            ${empOptionsHTML}
                        </select>
                    </div>
                    
                    <!-- 대상 부서 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">대상 부서 *</label>
                        <select id="cp-dept" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            <option value="">선택하세요</option>
                            ${deptOptionsHTML}
                        </select>
                    </div>
                    
                    <!-- 대상 직위 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">대상 직위</label>
                        <input type="text" id="cp-position" value="팀장" 
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                    
                    <!-- 시작일 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">시작일 *</label>
                        <input type="date" id="cp-start-date" value="${today}"
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                    
                    <!-- 종료일 -->
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">종료일 <span style="color:#6b7280;font-weight:normal;">(비워두면 계속)</span></label>
                        <input type="date" id="cp-end-date" 
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                    
                    <!-- 사유 -->
                    <div style="grid-column: span 2;">
                        <label style="display:block;font-weight:500;margin-bottom:6px;font-size:14px;">사유</label>
                        <input type="text" id="cp-reason" placeholder="예: 박팀장 육아휴직 대체"
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                </div>
                
                <div style="margin-top:16px;display:flex;justify-content:flex-end;">
                    <button type="button" onclick="submitConcurrentPosition()" class="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 등록
                    </button>
                </div>
            </div>
            
            <!-- 목록 -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 등록 현황</h3>
                
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;min-width:900px;">
                        <thead>
                            <tr style="background:#f3f4f6;">
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;">유형</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;">담당 직원</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;">대상 부서</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;">대상 직위</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;">시작일</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;">종료일</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;">상태</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:left;font-weight:600;">사유</th>
                                <th style="padding:12px;border-bottom:2px solid #e5e7eb;text-align:center;font-weight:600;width:100px;">관리</th>
                            </tr>
                        </thead>
                        <tbody id="concurrent-position-tbody">
                            ${tableRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- 수정 모달 -->
        <div id="cp-edit-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">
            <div style="background:white;padding:24px;border-radius:12px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">
                <h3 style="font-size:18px;font-weight:600;margin-bottom:20px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 겸직/직무대리 수정</h3>
                
                <input type="hidden" id="cp-edit-id">
                
                <div style="display:grid;gap:16px;">
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;">유형</label>
                        <select id="cp-edit-type" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            <option value="acting">직무대리</option>
                            <option value="concurrent">겸직</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;">담당 직원</label>
                        <select id="cp-edit-employee" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            ${empOptionsHTML}
                        </select>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;">대상 부서</label>
                        <select id="cp-edit-dept" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                            ${deptOptionsHTML}
                        </select>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;">대상 직위</label>
                        <input type="text" id="cp-edit-position" 
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="display:block;font-weight:500;margin-bottom:6px;">시작일</label>
                            <input type="date" id="cp-edit-start-date" 
                                   style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                        </div>
                        <div>
                            <label style="display:block;font-weight:500;margin-bottom:6px;">종료일</label>
                            <input type="date" id="cp-edit-end-date" 
                                   style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="display:block;font-weight:500;margin-bottom:6px;">사유</label>
                        <input type="text" id="cp-edit-reason" 
                               style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                </div>
                
                <div style="margin-top:24px;display:flex;gap:12px;justify-content:flex-end;">
                    <button type="button" onclick="closeCPEditModal()" class="btn btn-secondary">
                        취소
                    </button>
                    <button type="button" onclick="saveCPEdit()" class="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 저장
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== 이벤트 핸들러 =====

/**
 * 겸직/직무대리 등록 제출
 */
function submitConcurrentPosition() {
    try {
        const type = document.getElementById('cp-type').value;
        const employeeId = document.getElementById('cp-employee').value;
        const targetDept = document.getElementById('cp-dept').value;
        const targetPosition = document.getElementById('cp-position').value || '팀장';
        const startDate = document.getElementById('cp-start-date').value;
        const endDate = document.getElementById('cp-end-date').value || null;
        const reason = document.getElementById('cp-reason').value;
        
 // 검증
        if (!employeeId) {
            alert('담당 직원을 선택해주세요.');
            return;
        }
        
        if (!targetDept) {
            alert('대상 부서를 선택해주세요.');
            return;
        }
        
        if (!startDate) {
            alert('시작일을 입력해주세요.');
            return;
        }
        
        if (endDate && endDate < startDate) {
            alert('종료일은 시작일보다 이후여야 합니다.');
            return;
        }
        
        const position = {
            type,
            employeeId,
            targetDept,
            targetPosition,
            startDate,
            endDate,
            reason
        };
        
        if (addConcurrentPositionRecord(position)) {
            에러처리_인사?.success('겸직/직무대리가 등록되었습니다.');
            loadConcurrentPositionModule(); // 화면 새로고침
        }
        
    } catch (error) {
        console.error('[겸직관리] 등록 오류:', error);
        에러처리_인사?.handle(error, '등록 중 오류가 발생했습니다.');
    }
}

/**
 * 겸직/직무대리 수정 모달 열기
 * 
 * @param {string} id - 레코드 ID
 */
function editConcurrentPosition(id) {
    try {
        const positions = loadConcurrentPositions();
        const position = positions.find(p => p.id === id);
        
        if (!position) {
            alert('해당 레코드를 찾을 수 없습니다.');
            return;
        }
        
 // 모달에 값 설정
        document.getElementById('cp-edit-id').value = position.id;
        document.getElementById('cp-edit-type').value = position.type;
        document.getElementById('cp-edit-employee').value = position.employeeId;
        document.getElementById('cp-edit-dept').value = position.targetDept;
        document.getElementById('cp-edit-position').value = position.targetPosition || '팀장';
        document.getElementById('cp-edit-start-date').value = position.startDate || '';
        document.getElementById('cp-edit-end-date').value = position.endDate || '';
        document.getElementById('cp-edit-reason').value = position.reason || '';
        
 // 모달 표시
        document.getElementById('cp-edit-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('[겸직관리] 수정 모달 오류:', error);
    }
}

/**
 * 수정 모달 닫기
 */
function closeCPEditModal() {
    document.getElementById('cp-edit-modal').style.display = 'none';
}

/**
 * 수정 저장
 */
function saveCPEdit() {
    try {
        const id = document.getElementById('cp-edit-id').value;
        
        const updates = {
            type: document.getElementById('cp-edit-type').value,
            employeeId: document.getElementById('cp-edit-employee').value,
            targetDept: document.getElementById('cp-edit-dept').value,
            targetPosition: document.getElementById('cp-edit-position').value || '팀장',
            startDate: document.getElementById('cp-edit-start-date').value,
            endDate: document.getElementById('cp-edit-end-date').value || null,
            reason: document.getElementById('cp-edit-reason').value
        };
        
 // 검증
        if (updates.endDate && updates.endDate < updates.startDate) {
            alert('종료일은 시작일보다 이후여야 합니다.');
            return;
        }
        
        if (updateConcurrentPositionRecord(id, updates)) {
            에러처리_인사?.success('수정되었습니다.');
            closeCPEditModal();
            loadConcurrentPositionModule(); // 화면 새로고침
        }
        
    } catch (error) {
        console.error('[겸직관리] 수정 저장 오류:', error);
    }
}

/**
 * 삭제 확인
 * 
 * @param {string} id - 레코드 ID
 */
function confirmDeleteConcurrentPosition(id) {
    if (confirm('이 겸직/직무대리를 삭제하시겠습니까?')) {
        if (deleteConcurrentPositionRecord(id)) {
            에러처리_인사?.success('삭제되었습니다.');
            loadConcurrentPositionModule(); // 화면 새로고침
        }
    }
}

// ===== 외부 공개 API (네임스페이스) =====

/**
 * 겸직관리 외부 공개 API
 * 다른 모듈에서 겸직관리_인사.함수명() 형태로 호출 가능
 * 
 * @namespace 겸직관리_인사
 */
const 겸직관리_인사 = {
 // 데이터 조회
    loadConcurrentPositions,
    getActiveConcurrentPositions,
    getEmployeeConcurrentPositions,
    getDepartmentConcurrentHead,
    
 // 데이터 관리
    addConcurrentPositionRecord,
    updateConcurrentPositionRecord,
    deleteConcurrentPositionRecord,
    
 // UI
    loadConcurrentPositionModule
};

// ===== 초기화 =====

console.log(' 겸직관리_인사.js 로드 완료');
