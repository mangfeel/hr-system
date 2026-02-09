/**
 * 육아휴직_인사.js - 프로덕션급 리팩토링
 * 
 * 육아휴직 관리
 * - 육아휴직 등록 (검증 강화)
 * - 복직 처리
 * - 육아휴직 목록 조회
 * - 육아휴직 이력 수정/삭제
 * - 연속 휴직 지원
 * - 복직 취소 기능
 * 
 * @version 3.1.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.1.0 - Electron 호환 모달 적용 (2026-01-27)
 * - prompt() → 날짜 입력 모달 (showDateInputModal)
 * - 복직일 입력 시 달력 UI 제공
 * - Electron 환경 prompt() 미지원 문제 해결
 *
 * v3.0.4 - 긴급 버그 패치 #4 (2024-11-06)
 * - 버그 수정: saveMaternityLeave() - 중복 검증 로직 오류 수정
 * - 연속 휴직 상태에서도 중복 검증 실행하도록 수정
 * - isOnLeave = true일 때 검증 스킵 문제 해결
 * - 동일한 기간 연속 등록 완벽 차단
 * 
 * v3.0.3 - 긴급 버그 패치 #3 (2024-11-06)
 * - 버그 수정: saveMaternityLeave() - 육아휴직 기간 중복 검증 추가
 * - 버그 수정: saveMaternityEdit() - 육아휴직 기간 중복 검증 추가
 * - 동일한 기간으로 중복 등록 방지
 * - 수정 시에도 다른 이력과 겹침 방지
 * - 버그: 연속 휴직 시 검증 스킵 문제 (v3.0.4에서 수정)
 * 
 * v3.0.2 - 긴급 버그 패치 #2 (2024-11-06)
 * - 버그 수정: saveMaternityEdit() - 복직일 삭제 시 returnedAt 명시적 null 처리
 * - 버그 수정: saveMaternityEdit() - 직원목록 갱신 누락 (loadEmployeeList 추가)
 * - 버그 수정: saveMaternityLeave() - 직원목록 갱신 누락 (loadEmployeeList 추가)
 * - 버그 수정: endMaternityLeave() - 직원목록 갱신 누락 (loadEmployeeList 추가)
 * - 복직일 삭제 → 육아휴직 중 상태 복구 문제 해결
 * - 인사발령 패턴 적용 (전체 목록 화면 즉시 갱신)
 * 
 * v3.0.1 - 긴급 버그 패치 (2024-11-06)
 * - 버그 수정: saveMaternityLeave() - maternityLeave 객체 없을 때 생성
 * - 버그 수정: endMaternityLeave() - maternityLeave 객체 없을 때 생성
 * - 버그 수정: saveMaternityEdit() - maternityLeave 객체 없을 때 생성
 * - 버그 수정: saveMaternityEdit() - 화면 갱신 순서 수정 (ID 백업 후 모달 닫기)
 * - 구버전 데이터 및 Excel 가져오기 데이터 완벽 지원
 * 
 * v3.0 - 프로덕션급 리팩토링
 * - Phase 1 유틸리티 적용 (직원유틸, DOM유틸)
 * - 완벽한 에러 처리
 * - 체계적 로깅
 * - JSDoc 주석 추가
 * - XSS 방지
 * - 검증 강화 유지
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 변수 유지
 * - 전역 함수 유지
 * - 레거시 데이터 구조 지원
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 검증_인사.js (Validator)
 * - 호봉계산기_인사.js (DateUtils)
 * - 직원유틸_인사.js (직원유틸_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 */

// ===== Electron 호환 모달 유틸리티 (v3.1.0) =====

/**
 * 날짜 입력 모달 표시
 * @param {string} title - 모달 제목
 * @param {string} message - 안내 메시지
 * @param {string} defaultValue - 기본 날짜 (YYYY-MM-DD)
 * @returns {Promise<string|null>} 선택된 날짜 또는 null (취소)
 */
function showDateInputModal(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="dateInputModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 24px;
                    min-width: 360px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${title}</h3>
                    <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">${message}</p>
                    <input type="date" id="dateInputValue" value="${defaultValue}" style="
                        width: 100%; padding: 12px; font-size: 16px;
                        border: 2px solid #ddd; border-radius: 8px;
                        margin-bottom: 20px; box-sizing: border-box;
                    " />
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="dateInputCancel" style="
                            padding: 10px 20px; border: 1px solid #ddd;
                            background: white; border-radius: 6px; cursor: pointer;
                        ">취소</button>
                        <button id="dateInputConfirm" style="
                            padding: 10px 20px; border: none;
                            background: linear-gradient(135deg, #4f46e5 0%, #764ba2 100%);
                            color: white; border-radius: 6px; cursor: pointer;
                        ">확인</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('dateInputModal');
        const input = document.getElementById('dateInputValue');
        input.focus();
        
        document.getElementById('dateInputConfirm').onclick = () => {
            const value = input.value;
            modal.remove();
            resolve(value || null);
        };
        
        document.getElementById('dateInputCancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
        
 // Enter로 확인, ESC로 취소
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                modal.remove();
                resolve(value || null);
            } else if (e.key === 'Escape') {
                modal.remove();
                resolve(null);
            }
        };
    });
}

// ===== 전역 변수 =====

/**
 * 현재 수정 중인 직원 ID
 * @type {string|null}
 */
let currentEmployeeIdForMaternity = null;

/**
 * 현재 수정 중인 육아휴직 이력 인덱스
 * @type {number|null}
 */
let currentMaternityIndex = null;

// ===== 탭 로드 =====

/**
 * 육아휴직 탭 로드
 * 재직자 목록을 셀렉트박스에 표시하고 육아휴직 목록을 로드합니다.
 * 
 * @example
 * loadMaternityTab(); // 탭 초기화
 */
function loadMaternityTab() {
    try {
        로거_인사?.debug('육아휴직 탭 로드 시작');
        
        const employees = db.getActiveEmployees();
        const select = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('maternityEmployeeSelect')
            : document.getElementById('maternityEmployeeSelect');
        
        if (!select) {
            로거_인사?.error('직원 셀렉트박스를 찾을 수 없음');
            return;
        }
        
 // 옵션 생성
        const options = '<option value="">선택하세요</option>' + 
            employees.map(emp => {
                const name = typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.getName(emp)
                    : (emp.personalInfo?.name || emp.name);
                
                const dept = typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.getDepartment(emp)
                    : (emp.currentPosition?.dept || emp.dept);
                
                const isOnLeave = emp.maternityLeave?.isOnLeave ? ' (휴직)' : '';
                
 // XSS 방지
                const safeName = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(name)
                    : name;
                const safeDept = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(dept)
                    : dept;
                
                return `<option value="${emp.id}">${safeName} (${safeDept})${isOnLeave}</option>`;
            }).join('');
        
        select.innerHTML = options;
        
        로거_인사?.info('육아휴직 탭 로드 완료', { count: employees.length });
        
 // 육아휴직 목록 로드
        loadMaternityList();
        
    } catch (error) {
        로거_인사?.error('육아휴직 탭 로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '육아휴직 탭을 로드하는 중 오류가 발생했습니다.');
        }
    }
}

// ===== 육아휴직 등록 =====

/**
 * 육아휴직 저장
 * 
 * @description
 * 육아휴직을 등록합니다.
 * - 검증 1: 육아휴직 기간 검증 (Validator.validateMaternityLeave)
 * - 검증 2: 날짜 범위 검증 (1900~2100)
 * - 연속 휴직 지원 (첫째/둘째 구분)
 * - 이력 자동 기록
 * 
 * @example
 * saveMaternityLeave(); // 폼 데이터 검증 및 저장
 */
function saveMaternityLeave() {
    try {
        로거_인사?.info('육아휴직 등록 시작');
        
 // ===== 입력값 수집 =====
        const getValue = (id) => {
            const elem = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(id)
                : document.getElementById(id);
            return elem ? (elem.value || '').trim() : '';
        };
        
        const empId = getValue('maternityEmployeeSelect');
        const startDate = getValue('maternityStartDate');
        const endDate = getValue('maternityEndDate');
        
        로거_인사?.debug('입력값 수집', { empId, startDate, endDate });
        
 // ===== 검증 0: 필수 항목 검증 =====
        if (!empId || !startDate || !endDate) {
            로거_인사?.warn('필수 항목 누락');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('필수 항목을 입력하세요.');
            } else {
                alert('[주의] 필수 항목을 입력하세요.');
            }
            return;
        }
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name);
        
 // ===== 버그 수정: maternityLeave 객체 확보 =====
 // 구버전 데이터는 maternityLeave 객체가 없을 수 있음
        if (!emp.maternityLeave) {
            로거_인사?.debug('maternityLeave 객체 생성 (구버전 데이터)');
            
            emp.maternityLeave = {
                isOnLeave: false,
                startDate: null,
                endDate: null,
                history: []
            };
        }
        
 // 버그 수정: history 배열 확보
        if (!emp.maternityLeave.history) {
            로거_인사?.debug('history 배열 생성');
            emp.maternityLeave.history = [];
        }
        
 // ===== 검증 1: 육아휴직 기간 검증 =====
        const validation = Validator.validateMaternityLeave(startDate, endDate);
        
        if (!validation.valid) {
            로거_인사?.warn('육아휴직 기간 검증 실패', { errors: validation.errors });
            
            const errorMsg = '[주의] 육아휴직 기간 검증 실패:\n\n' + validation.errors.join('\n');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
 // ===== 검증 2: 날짜 범위 검증 =====
        if (!Validator.isDateInValidRange(startDate) || !Validator.isDateInValidRange(endDate)) {
            로거_인사?.warn('날짜가 유효 범위를 벗어남', { startDate, endDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('휴직 날짜가 유효한 범위(1900~2100)를 벗어났습니다.');
            } else {
                alert('[주의] 휴직 날짜가 유효한 범위(1900~2100)를 벗어났습니다.');
            }
            return;
        }
        
 // ===== 검증 3: 기존 이력과 중복 검증 =====
 // 연속 휴직이든 아니든 중복은 방지해야 함!
        if (emp.maternityLeave?.history && emp.maternityLeave.history.length > 0) {
            로거_인사?.debug('기존 이력 중복 검증 시작', { 
                newStart: startDate, 
                newEnd: endDate,
                isOnLeave: emp.maternityLeave?.isOnLeave || false,
                historyCount: emp.maternityLeave.history.length 
            });
            
 // 날짜 겹침 검사
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            
            for (let i = 0; i < emp.maternityLeave.history.length; i++) {
                const history = emp.maternityLeave.history[i];
                const histStart = new Date(history.startDate);
                const histEnd = new Date(history.plannedEndDate);
                
 // 겹침 조건: (새시작 <= 기존끝) AND (새끝 >= 기존시작)
                const isOverlap = (newStart <= histEnd) && (newEnd >= histStart);
                
                if (isOverlap) {
                    로거_인사?.warn('육아휴직 기간 중복 감지', {
                        newPeriod: `${startDate} ~ ${endDate}`,
                        existingPeriod: `${history.startDate} ~ ${history.plannedEndDate}`,
                        historyIndex: i,
                        isOnLeave: emp.maternityLeave?.isOnLeave
                    });
                    
                    const errorMsg = `[주의] 육아휴직 기간이 기존 이력과 겹칩니다!\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `[등록하려는 기간]\n` +
                        `${startDate} ~ ${endDate}\n\n` +
                        `[기존 이력 ${i + 1}]\n` +
                        `${history.startDate} ~ ${history.plannedEndDate}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `[안내] 실수로 중복 등록하려는 것이라면:\n` +
                        `   → 취소하세요.\n\n` +
                        `[안내] 연속 휴직(첫째→둘째)이라면:\n` +
                        `   → 날짜를 겹치지 않게 입력하세요.\n` +
                        `   → 또는 기존 이력을 먼저 수정/삭제하세요.`;
                    
                    if (typeof 에러처리_인사 !== 'undefined') {
                        에러처리_인사.warn(errorMsg);
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
            }
            
            로거_인사?.debug('중복 없음 - 등록 진행');
        }
        
 // ===== 연속 휴직 처리 =====
 // 이미 휴직 중인 경우 (연속 휴직: 첫째 → 둘째)
        if (emp.maternityLeave?.isOnLeave) {
            const previousStart = emp.maternityLeave.startDate;
            const previousPlannedEnd = emp.maternityLeave.endDate;
            
            로거_인사?.debug('연속 휴직 감지', { previousStart, previousPlannedEnd });
            
            const confirmMsg = `[주의] ${name} 님은 현재 육아휴직 중입니다.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `[첫째 육아휴직 종료 처리]\n` +
                `• 시작일: ${previousStart}\n` +
                `• 예정 종료일: ${previousPlannedEnd}\n` +
                `• 실제 종료일: ${previousPlannedEnd}\n` +
                `  (복직은 안 했지만 행정상 종료)\n\n` +
                `[둘째 육아휴직 새로 시작]\n` +
                `• 시작일: ${startDate}\n` +
                `• 예정 종료일: ${endDate}\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `[안내] 연속 휴직이지만 기록상으로는\n` +
                `   첫째/둘째를 구분하여 저장합니다.\n\n` +
                `계속하시겠습니까?`;
            
            const confirmed = typeof 에러처리_인사 !== 'undefined'
                ? 에러처리_인사.confirm(confirmMsg)
                : confirm(confirmMsg);
            
            if (!confirmed) {
                로거_인사?.debug('연속 휴직 등록 취소');
                return;
            }
            
 // 이전 휴직을 연속휴직으로 종료
            if (emp.maternityLeave.history && emp.maternityLeave.history.length > 0) {
                const lastIndex = emp.maternityLeave.history.length - 1;
                emp.maternityLeave.history[lastIndex].actualEndDate = previousPlannedEnd;
                emp.maternityLeave.history[lastIndex].returnedAt = new Date().toISOString();
                emp.maternityLeave.history[lastIndex].continuousMaternity = true;
                
                로거_인사?.debug('이전 휴직 종료 처리 완료', { lastIndex });
            }
        }
        
 // ===== 새 육아휴직 등록 =====
 // 객체 안전성 확보
        if (!emp.maternityLeave) {
            emp.maternityLeave = {
                isOnLeave: false,
                startDate: null,
                endDate: null,
                history: []
            };
        }
        
 // 육아휴직 상태 업데이트
        emp.maternityLeave.isOnLeave = true;
        emp.maternityLeave.startDate = startDate;
        emp.maternityLeave.endDate = endDate;
        
 // 이력 배열 확보
        if (!emp.maternityLeave.history) {
            emp.maternityLeave.history = [];
        }
        
 // 이력 추가
        emp.maternityLeave.history.push({
            startDate: startDate,
            plannedEndDate: endDate,
            actualEndDate: null,
            registeredAt: new Date().toISOString(),
            returnedAt: null
        });
        
 // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('육아휴직 등록 완료', { name, startDate, endDate });
        
 // 성공 메시지
        const successMsg = `${name} 님의 육아휴직이 등록되었습니다.\n\n기간: ${startDate} ~ ${endDate}\n\n[안내] 복직 시 "복직 처리" 버튼을 클릭하세요.`;
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(`${name} 님의 육아휴직이 등록되었습니다.`);
        } else {
            alert(successMsg);
        }
        
 // 폼 초기화
        _resetMaternityForm();
        
 // UI 업데이트
        if (typeof loadEmployeeList === 'function') {
            로거_인사?.debug('직원 목록 갱신 호출');
            loadEmployeeList();
        }
        
        loadMaternityList();
        
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
    } catch (error) {
        로거_인사?.error('육아휴직 등록 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '육아휴직 등록 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 육아휴직 등록 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 육아휴직 폼 초기화 (Private)
 * 
 * @private
 */
function _resetMaternityForm() {
    try {
        const fields = ['maternityEmployeeSelect', 'maternityStartDate', 'maternityEndDate'];
        
        fields.forEach(id => {
            const elem = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(id)
                : document.getElementById(id);
            
            if (elem) {
                if (typeof DOM유틸_인사 !== 'undefined') {
                    DOM유틸_인사.setValue(elem, '');
                } else {
                    elem.value = '';
                }
            }
        });
        
        로거_인사?.debug('육아휴직 폼 초기화 완료');
        
    } catch (error) {
        로거_인사?.error('폼 초기화 실패', error);
    }
}

// ===== 육아휴직 목록 =====

/**
 * 육아휴직 중인 직원 목록 로드
 * 
 * @description
 * 현재 육아휴직 중인 직원들의 목록을 표시합니다.
 * - 휴직 시작일/종료일 표시
 * - 복직 처리 버튼 제공
 * - XSS 방지
 * 
 * @example
 * loadMaternityList(); // 목록 갱신
 */
function loadMaternityList() {
    try {
        로거_인사?.debug('육아휴직 목록 로드 시작');
        
        const employees = db.getEmployees().filter(emp => emp.maternityLeave?.isOnLeave);
        
        로거_인사?.debug('육아휴직 중인 직원 수', { count: employees.length });
        
        let listHTML;
        
        if (employees.length > 0) {
            listHTML = employees.map(emp => {
                const name = typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.getName(emp)
                    : (emp.personalInfo?.name || emp.name);
                
                const dept = typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.getDepartment(emp)
                    : (emp.currentPosition?.dept || emp.dept);
                
                const startDate = emp.maternityLeave.startDate;
                const endDate = emp.maternityLeave.endDate;
                
 // XSS 방지
                const safeName = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(name)
                    : name;
                const safeDept = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(dept)
                    : dept;
                const safeStartDate = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(startDate)
                    : startDate;
                const safeEndDate = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.escapeHtml(endDate)
                    : endDate;
                
                return `
                    <div class="employee-item">
                        <div class="employee-header">
                            <div>
                                <div class="employee-name">${safeName} <span class="badge badge-maternity">육아휴직</span></div>
                                <div class="employee-id">${safeDept}</div>
                            </div>
                        </div>
                        <div class="employee-info-grid">
                            <div class="employee-info-item"><span class="employee-info-label">시작일:</span> ${safeStartDate}</div>
                            <div class="employee-info-item"><span class="employee-info-label">종료일(예정):</span> ${safeEndDate}</div>
                        </div>
                        <div style="margin-top: 12px;">
                            <button class="btn btn-success btn-small" onclick="endMaternityLeave('${emp.id}')">복직 처리</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            listHTML = '<div class="empty-state"><p>육아휴직 중인 직원이 없습니다</p></div>';
        }
        
        const listContainer = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('maternityList')
            : document.getElementById('maternityList');
        
        if (listContainer) {
            listContainer.innerHTML = listHTML;
        }
        
        로거_인사?.info('육아휴직 목록 로드 완료', { count: employees.length });
        
    } catch (error) {
        로거_인사?.error('육아휴직 목록 로드 실패', error);
    }
}

// ===== 복직 처리 =====

/**
 * 복직 처리
 * 
 * @param {string} empId - 직원 ID
 * 
 * @description
 * 육아휴직 중인 직원의 복직을 처리합니다.
 * - 복직일 입력 및 검증
 * - 검증 1: 복직일 날짜 형식
 * - 검증 2: 복직일 범위 (1900~2100)
 * - 검증 3: 복직일이 휴직 시작일 이후인지
 * - 이력 자동 기록
 * - 인사발령 연동 (선택)
 * 
 * @example
 * endMaternityLeave('employee-id'); // 복직 처리
 */
async function endMaternityLeave(empId) {
    try {
        로거_인사?.info('복직 처리 시작', { empId });
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
 // ===== 버그 수정: maternityLeave 객체 확보 =====
 // 구버전 데이터는 maternityLeave 객체가 없을 수 있음
        if (!emp.maternityLeave) {
            로거_인사?.warn('육아휴직 정보가 없습니다');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('육아휴직 중이 아닙니다.');
            } else {
                alert('[주의] 육아휴직 중이 아닙니다.');
            }
            return;
        }
        
 // 버그 수정: history 배열 확보
        if (!emp.maternityLeave.history) {
            로거_인사?.debug('history 배열 생성');
            emp.maternityLeave.history = [];
        }
        
 // 육아휴직 중인지 확인
        if (!emp.maternityLeave.isOnLeave) {
            로거_인사?.warn('육아휴직 중이 아님', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('육아휴직 중이 아닙니다.');
            } else {
                alert('[주의] 육아휴직 중이 아닙니다.');
            }
            return;
        }
        
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name);
        
        const today = DateUtils.formatDate(new Date());
        
 // v3.1.0: prompt() → 날짜 입력 모달 (Electron 호환)
        const returnDate = await showDateInputModal(
            '복직일 입력',
            `${name} 님의 복직일을 선택하세요.`,
            today
        );
        
        if (!returnDate) {
            로거_인사?.debug('복직 처리 취소');
            return;
        }
        
        로거_인사?.debug('복직일 입력', { returnDate });
        
 // ===== 검증 1: 복직일 날짜 형식 검증 =====
        if (!Validator.isValidDate(returnDate)) {
            로거_인사?.warn('복직일 형식 오류', { returnDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('복직일 형식이 올바르지 않습니다.\n\nYYYY-MM-DD 형식으로 입력하세요.');
            } else {
                alert('[주의] 복직일 형식이 올바르지 않습니다.\n\nYYYY-MM-DD 형식으로 입력하세요.');
            }
            return;
        }
        
 // ===== 검증 2: 복직일 범위 검증 =====
        if (!Validator.isDateInValidRange(returnDate)) {
            로거_인사?.warn('복직일이 유효 범위를 벗어남', { returnDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('복직일이 유효한 범위(1900~2100)를 벗어났습니다.');
            } else {
                alert('[주의] 복직일이 유효한 범위(1900~2100)를 벗어났습니다.');
            }
            return;
        }
        
 // ===== 검증 3: 복직일이 휴직 시작일 이후인지 검증 =====
        if (emp.maternityLeave?.startDate && Validator.isDateBefore(returnDate, emp.maternityLeave.startDate)) {
            로거_인사?.warn('복직일이 휴직 시작일보다 빠름', {
                startDate: emp.maternityLeave.startDate,
                returnDate
            });
            
            const errorMsg = `[주의] 복직일이 휴직 시작일보다 빠릅니다.\n\n휴직 시작일: ${emp.maternityLeave.startDate}\n복직일: ${returnDate}\n\n날짜를 확인해주세요.`;
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn(errorMsg);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
 // ===== 확인 메시지 =====
        const confirmMsg = `${name} 님의 복직을 처리하시겠습니까?\n\n복직일: ${returnDate}\n\n안내:\n• 육아휴직 이력은 계속 보존됩니다.\n• 복직 시 부서/직위가 변경되는 경우 "인사발령" 탭에서 발령을 등록하세요.`;
        
        const confirmed = typeof 에러처리_인사 !== 'undefined'
            ? 에러처리_인사.confirm(confirmMsg)
            : confirm(confirmMsg);
        
        if (!confirmed) {
            로거_인사?.debug('복직 처리 취소');
            return;
        }
        
 // ===== 복직 처리 =====
        if (emp.maternityLeave.isOnLeave) {
            emp.maternityLeave.endDate = returnDate;
        }
        
 // 이력에 복직일 기록
        if (emp.maternityLeave.history && emp.maternityLeave.history.length > 0) {
            const lastIndex = emp.maternityLeave.history.length - 1;
            emp.maternityLeave.history[lastIndex].actualEndDate = returnDate;
            emp.maternityLeave.history[lastIndex].returnedAt = new Date().toISOString();
        }
        
        emp.maternityLeave.isOnLeave = false;
        
 // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('복직 처리 완료', { name, returnDate });
        
 // ===== 인사발령 연동 확인 =====
        const needsAssignment = confirm(`${name} 님이 복직 처리되었습니다.\n\n복직 시 부서나 직위가 변경되었나요?\n\n"예"를 선택하면 인사발령 탭으로 이동합니다.`);
        
        if (needsAssignment) {
            로거_인사?.debug('인사발령 탭으로 이동');
            
            if (typeof navigateToModule === 'function') {
                navigateToModule('assignment');
            }
            
            setTimeout(() => {
                const select = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.getById('assignmentEmployeeSelect')
                    : document.getElementById('assignmentEmployeeSelect');
                
                if (select) {
                    select.value = empId;
                }
                
                if (typeof loadEmployeeForAssignment === 'function') {
                    loadEmployeeForAssignment();
                }
                
                const dateField = typeof DOM유틸_인사 !== 'undefined'
                    ? DOM유틸_인사.getById('assignmentDate')
                    : document.getElementById('assignmentDate');
                
                if (dateField) {
                    if (typeof DOM유틸_인사 !== 'undefined') {
                        DOM유틸_인사.setValue(dateField, returnDate);
                    } else {
                        dateField.value = returnDate;
                    }
                }
                
                alert(`[안내] 복직일(${returnDate})이 자동으로 발령일에 입력되었습니다.\n\n변경된 부서/직위를 입력하고 "인사발령 등록"을 클릭하세요.`);
            }, 100);
        } else {
 // UI 갱신
            if (typeof loadEmployeeList === 'function') {
                로거_인사?.debug('직원 목록 갱신 호출');
                loadEmployeeList();
            }
            
            loadMaternityList();
            
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }
        
    } catch (error) {
        로거_인사?.error('복직 처리 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '복직 처리 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 복직 처리 중 오류가 발생했습니다.');
        }
    }
}

// ===== 육아휴직 수정 =====

/**
 * 육아휴직 수정 모달 열기
 * 
 * @param {string} empId - 직원 ID
 * @param {number} histIndex - 이력 인덱스
 * @param {boolean} [isLegacy=false] - 레거시 데이터 여부
 * 
 * @description
 * 육아휴직 이력을 수정할 수 있는 모달을 엽니다.
 * - 레거시 데이터 지원 (구버전 호환)
 * - 복직 취소 기능 (실제 복직일 삭제)
 * - XSS 방지
 * 
 * @example
 * editMaternity('emp-id', 0, false); // 첫 번째 이력 수정
 * editMaternity('emp-id', -1, true); // 레거시 데이터 수정
 */
function editMaternity(empId, histIndex, isLegacy) {
    try {
        로거_인사?.debug('육아휴직 수정 모달 열기', { empId, histIndex, isLegacy });
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId });
            return;
        }
        
        let history;
        
        if (isLegacy) {
 // 레거시 데이터 (구버전 호환)
            history = {
                startDate: emp.maternityLeave.startDate,
                plannedEndDate: emp.maternityLeave.endDate,
                actualEndDate: (typeof 직원유틸_인사 !== 'undefined' 
                    ? 직원유틸_인사.getEmploymentStatus(emp)
                    : emp.employment?.status) === '퇴사' 
                    ? emp.maternityLeave.endDate 
                    : null
            };
        } else {
            if (!emp.maternityLeave?.history || !emp.maternityLeave.history[histIndex]) {
                로거_인사?.error('이력을 찾을 수 없음', { histIndex });
                return;
            }
            history = emp.maternityLeave.history[histIndex];
        }
        
        currentEmployeeIdForMaternity = empId;
        currentMaternityIndex = isLegacy ? -1 : histIndex;
        
        로거_인사?.debug('현재 편집 대상 설정', { 
            currentEmployeeIdForMaternity, 
            currentMaternityIndex 
        });
        
 // 모달 HTML 생성
        const modalContent = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editMaternityModal')
            : document.getElementById('editMaternityModal');
        
        if (!modalContent) {
            로거_인사?.error('모달 컨테이너를 찾을 수 없음');
            return;
        }
        
 // XSS 방지
        const safeStartDate = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(history.startDate)
            : history.startDate;
        const safePlannedEnd = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(history.plannedEndDate || history.endDate || '')
            : (history.plannedEndDate || history.endDate || '');
        const safeActualEnd = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(history.actualEndDate || '')
            : (history.actualEndDate || '');
        
        modalContent.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <div class="modal-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 육아휴직 수정</div>
                    <button class="modal-close" onclick="closeEditMaternityModal()">×</button>
                </div>
                <div class="alert alert-info">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                    <span><strong>복직 취소:</strong> 실수로 복직 처리한 경우, "실제 복직일"을 비우고 저장하면 다시 "육아휴직 중" 상태로 복구됩니다.</span>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>휴직 시작일 *</label>
                        <input type="date" id="editMaternityStartDate" class="form-control" value="${safeStartDate}">
                    </div>
                    <div class="form-group">
                        <label>예정 종료일 *</label>
                        <input type="date" id="editMaternityPlannedEndDate" class="form-control" value="${safePlannedEnd}">
                    </div>
                </div>
                <div class="form-group">
                    <label>실제 복직일 (복직한 경우만)</label>
                    <input type="date" id="editMaternityActualEndDate" class="form-control" value="${safeActualEnd}" placeholder="복직하지 않았으면 비워두세요">
                </div>
                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button class="btn btn-primary" style="flex:1;" onclick="saveMaternityEdit()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 저장</button>
                    <button class="btn btn-secondary" onclick="closeEditMaternityModal()">취소</button>
                </div>
            </div>
        `;
        
        modalContent.classList.add('show');
        
        로거_인사?.debug('육아휴직 수정 모달 표시 완료');
        
    } catch (error) {
        로거_인사?.error('육아휴직 수정 모달 열기 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '육아휴직 수정 모달을 여는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 육아휴직 수정 모달 닫기
 * 
 * @example
 * closeEditMaternityModal(); // 모달 닫기
 */
function closeEditMaternityModal() {
    try {
        currentEmployeeIdForMaternity = null;
        currentMaternityIndex = null;
        
        const modalContent = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editMaternityModal')
            : document.getElementById('editMaternityModal');
        
        if (modalContent) {
            modalContent.classList.remove('show');
        }
        
        로거_인사?.debug('육아휴직 수정 모달 닫기');
        
    } catch (error) {
        로거_인사?.error('모달 닫기 실패', error);
    }
}

/**
 * 육아휴직 수정 저장
 * 
 * @description
 * 수정된 육아휴직 이력을 저장합니다.
 * - 레거시 데이터를 정식 이력으로 전환
 * - 복직 취소 기능 (실제 복직일 삭제 시)
 * - 검증: 육아휴직 기간
 * - 검증: 복직일이 시작일 이후인지
 * 
 * @example
 * saveMaternityEdit(); // 수정 내용 저장
 */
function saveMaternityEdit() {
    try {
        if (currentEmployeeIdForMaternity === null) {
            로거_인사?.warn('현재 편집 중인 직원이 없음');
            return;
        }
        
        로거_인사?.info('육아휴직 수정 저장 시작', {
            empId: currentEmployeeIdForMaternity,
            index: currentMaternityIndex
        });
        
        const emp = db.findEmployee(currentEmployeeIdForMaternity);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
 // ===== 버그 수정: maternityLeave 객체 확보 =====
 // 구버전 데이터는 maternityLeave 객체가 없을 수 있음
        if (!emp.maternityLeave) {
            로거_인사?.debug('maternityLeave 객체 생성');
            
            emp.maternityLeave = {
                isOnLeave: false,
                startDate: null,
                endDate: null,
                history: []
            };
        }
        
 // 버그 수정: history 배열 확보
        if (!emp.maternityLeave.history) {
            로거_인사?.debug('history 배열 생성');
            emp.maternityLeave.history = [];
        }
        
 // 입력값 수집
        const getValue = (id) => {
            const elem = typeof DOM유틸_인사 !== 'undefined'
                ? DOM유틸_인사.getById(id)
                : document.getElementById(id);
            return elem ? (elem.value || '').trim() : '';
        };
        
        const newStartDate = getValue('editMaternityStartDate');
        const newPlannedEndDate = getValue('editMaternityPlannedEndDate');
        const newActualEndDate = getValue('editMaternityActualEndDate');
        
        로거_인사?.debug('수정 입력값', { newStartDate, newPlannedEndDate, newActualEndDate });
        
 // ===== 검증 0: 필수 항목 =====
        if (!newStartDate || !newPlannedEndDate) {
            로거_인사?.warn('필수 항목 누락');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('필수 항목을 입력하세요.');
            } else {
                alert('[주의] 필수 항목을 입력하세요.');
            }
            return;
        }
        
 // ===== 검증 1: 육아휴직 기간 검증 =====
        const validation = Validator.validateMaternityLeave(newStartDate, newPlannedEndDate);
        
        if (!validation.valid) {
            로거_인사?.warn('육아휴직 기간 검증 실패', { errors: validation.errors });
            
            const errorMsg = '[주의] 육아휴직 기간 검증 실패:\n\n' + validation.errors.join('\n');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
 // ===== 검증 2: 복직일 검증 (있는 경우만) =====
        if (newActualEndDate && newActualEndDate.trim() !== '') {
            if (!Validator.isValidDate(newActualEndDate)) {
                로거_인사?.warn('복직일 형식 오류', { newActualEndDate });
                
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.warn('복직일 형식이 올바르지 않습니다.');
                } else {
                    alert('[주의] 복직일 형식이 올바르지 않습니다.');
                }
                return;
            }
            
            if (Validator.isDateBefore(newActualEndDate, newStartDate)) {
                로거_인사?.warn('복직일이 시작일보다 빠름', { newActualEndDate, newStartDate });
                
                const errorMsg = `[주의] 복직일이 휴직 시작일보다 빠릅니다.\n\n시작일: ${newStartDate}\n복직일: ${newActualEndDate}`;
                
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.warn(errorMsg);
                } else {
                    alert(errorMsg);
                }
                return;
            }
        }
        
        const isActualEndDateEmpty = !newActualEndDate || newActualEndDate.trim() === '';
        
 // ===== 검증 3: 기존 다른 이력과 중복 검증 =====
        if (emp.maternityLeave?.history && emp.maternityLeave.history.length > 1) {
            로거_인사?.debug('기존 이력 중복 검증 시작 (수정)', {
                newStart: newStartDate,
                newEnd: newPlannedEndDate,
                currentIndex: currentMaternityIndex,
                historyCount: emp.maternityLeave.history.length
            });
            
            const newStart = new Date(newStartDate);
            const newEnd = new Date(newPlannedEndDate);
            
            for (let i = 0; i < emp.maternityLeave.history.length; i++) {
 // 자기 자신은 제외
                if (i === currentMaternityIndex) {
                    continue;
                }
                
                const history = emp.maternityLeave.history[i];
                const histStart = new Date(history.startDate);
                const histEnd = new Date(history.plannedEndDate);
                
 // 겹침 조건: (새시작 <= 기존끝) AND (새끝 >= 기존시작)
                const isOverlap = (newStart <= histEnd) && (newEnd >= histStart);
                
                if (isOverlap) {
                    로거_인사?.warn('육아휴직 기간 중복 감지 (수정)', {
                        newPeriod: `${newStartDate} ~ ${newPlannedEndDate}`,
                        existingPeriod: `${history.startDate} ~ ${history.plannedEndDate}`,
                        conflictIndex: i
                    });
                    
                    const errorMsg = `[주의] 육아휴직 기간이 다른 이력과 겹칩니다!\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `[수정하려는 기간]\n` +
                        `${newStartDate} ~ ${newPlannedEndDate}\n\n` +
                        `[기존 이력 ${i + 1}]\n` +
                        `${history.startDate} ~ ${history.plannedEndDate}\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `[안내] 겹치지 않는 날짜로 수정하세요.`;
                    
                    if (typeof 에러처리_인사 !== 'undefined') {
                        에러처리_인사.warn(errorMsg);
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
            }
            
            로거_인사?.debug('중복 없음 - 수정 진행');
        }
        
 // ===== 레거시 데이터 처리 =====
        if (currentMaternityIndex === -1) {
            로거_인사?.debug('레거시 데이터를 정식 이력으로 전환');
            
 // 이력 배열 초기화
            if (!emp.maternityLeave.history) {
                emp.maternityLeave.history = [];
            }
            
 // 정식 이력으로 추가
            emp.maternityLeave.history.push({
                startDate: newStartDate,
                plannedEndDate: newPlannedEndDate,
                actualEndDate: isActualEndDateEmpty ? null : newActualEndDate,
                registeredAt: new Date().toISOString(),
                returnedAt: isActualEndDateEmpty ? null : new Date().toISOString(),
                continuousMaternity: false
            });
            
 // 현재 상태 업데이트
            emp.maternityLeave.startDate = newStartDate;
            emp.maternityLeave.endDate = isActualEndDateEmpty ? newPlannedEndDate : newActualEndDate;
            emp.maternityLeave.isOnLeave = isActualEndDateEmpty && (
                typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.isActive(emp)
                    : emp.employment?.status === '재직'
            );
            
            db.saveEmployee(emp);
            
            로거_인사?.info('레거시 데이터 전환 완료');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.success('기초 데이터가 정식 이력으로 전환되어 저장되었습니다.');
            } else {
                alert('기초 데이터가 정식 이력으로 전환되어 저장되었습니다.');
            }
            
        } else {
 // ===== 기존 이력 수정 =====
            로거_인사?.debug('기존 이력 수정', { index: currentMaternityIndex });
            
 // 기존 이력 데이터 수정
            const historyItem = {
                startDate: newStartDate,
                plannedEndDate: newPlannedEndDate,
                actualEndDate: isActualEndDateEmpty ? null : newActualEndDate,
                registeredAt: emp.maternityLeave.history[currentMaternityIndex].registeredAt || new Date().toISOString(),
                continuousMaternity: emp.maternityLeave.history[currentMaternityIndex].continuousMaternity
            };
            
 // returnedAt 명시적 설정
            if (isActualEndDateEmpty) {
 // 복직일 삭제 → returnedAt도 명시적으로 null
                historyItem.returnedAt = null;
                로거_인사?.debug('복직일 삭제: returnedAt = null 설정');
            } else {
 // 복직일 입력 → returnedAt 설정
                historyItem.returnedAt = emp.maternityLeave.history[currentMaternityIndex].returnedAt || new Date().toISOString();
            }
            
            emp.maternityLeave.history[currentMaternityIndex] = historyItem;
            
            const isLastHistory = currentMaternityIndex === emp.maternityLeave.history.length - 1;
            
            if (isLastHistory) {
                if (isActualEndDateEmpty) {
 // 복직 취소 - 다시 휴직 중으로
                    로거_인사?.debug('복직 취소: 다시 휴직 중으로 전환');
                    
                    emp.maternityLeave.isOnLeave = true;
                    emp.maternityLeave.startDate = newStartDate;
                    emp.maternityLeave.endDate = newPlannedEndDate;
                } else {
                    emp.maternityLeave.isOnLeave = false;
                    emp.maternityLeave.startDate = newStartDate;
                    emp.maternityLeave.endDate = newActualEndDate;
                }
            }
            
            db.saveEmployee(emp);
            
            로거_인사?.info('육아휴직 이력 수정 완료');
            
            if (isLastHistory && isActualEndDateEmpty) {
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.success('육아휴직 이력이 수정되었습니다.\n\n실제 복직일을 삭제하여 "육아휴직 중" 상태로 복구되었습니다.');
                } else {
                    alert('육아휴직 이력이 수정되었습니다.\n\n[안내] 실제 복직일을 삭제하여 "육아휴직 중" 상태로 복구되었습니다.');
                }
            } else {
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.success('육아휴직 이력이 수정되었습니다.');
                } else {
                    alert('육아휴직 이력이 수정되었습니다.');
                }
            }
        }
        
 // ===== ID 백업 (closeEditMaternityModal에서 초기화되기 전) =====
        const empIdToRefresh = currentEmployeeIdForMaternity;
        
 // ===== 직원 목록 갱신 (전체 목록 화면) =====
        if (typeof loadEmployeeList === 'function') {
            로거_인사?.debug('직원 목록 갱신 호출');
            loadEmployeeList();
        }
        
 // ===== 직원 상세 모달 갱신 (백업한 ID 사용) =====
        if (typeof showEmployeeDetail === 'function') {
            showEmployeeDetail(empIdToRefresh);
        }
        
 // ===== 육아휴직 목록 갱신 =====
        loadMaternityList();
        
 // ===== 마지막으로 모달 닫기 (전역변수 초기화) =====
        closeEditMaternityModal();
        
    } catch (error) {
        로거_인사?.error('육아휴직 수정 저장 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '육아휴직 수정 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 육아휴직 수정 중 오류가 발생했습니다.');
        }
    }
}

// ===== 육아휴직 삭제 =====

/**
 * 육아휴직 이력 삭제
 * 
 * @param {string} empId - 직원 ID
 * @param {number} histIndex - 이력 인덱스
 * @param {boolean} [isLegacy=false] - 레거시 데이터 여부
 * 
 * @description
 * 육아휴직 이력을 삭제합니다.
 * - 레거시 데이터 삭제 시 전체 육아휴직 정보 초기화
 * - 정식 이력 삭제 시 해당 항목만 제거
 * 
 * @example
 * deleteMaternity('emp-id', 0, false); // 첫 번째 이력 삭제
 * deleteMaternity('emp-id', -1, true); // 레거시 데이터 삭제
 */
function deleteMaternity(empId, histIndex, isLegacy) {
    try {
        로거_인사?.debug('육아휴직 삭제 시작', { empId, histIndex, isLegacy });
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        let history;
        
        if (isLegacy) {
            history = {
                startDate: emp.maternityLeave.startDate,
                endDate: emp.maternityLeave.endDate
            };
        } else {
            if (!emp.maternityLeave?.history || !emp.maternityLeave.history[histIndex]) {
                로거_인사?.error('이력을 찾을 수 없음', { histIndex });
                return;
            }
            history = emp.maternityLeave.history[histIndex];
        }
        
        const period = `${history.startDate} ~ ${history.endDate || history.plannedEndDate}`;
        const confirmMsg = `[주의] 이 육아휴직 이력을 삭제하시겠습니까?\n\n기간: ${period}`;
        
        const confirmed = typeof 에러처리_인사 !== 'undefined'
            ? 에러처리_인사.confirm(confirmMsg)
            : confirm(confirmMsg);
        
        if (!confirmed) {
            로거_인사?.debug('육아휴직 삭제 취소');
            return;
        }
        
 // 삭제 처리
        if (isLegacy) {
 // 레거시 데이터 전체 초기화
            로거_인사?.debug('레거시 데이터 전체 초기화');
            
            emp.maternityLeave = {
                isOnLeave: false,
                startDate: null,
                endDate: null,
                history: []
            };
        } else {
 // 특정 이력 삭제
            로거_인사?.debug('특정 이력 삭제', { histIndex });
            
            emp.maternityLeave.history.splice(histIndex, 1);
        }
        
        db.saveEmployee(emp);
        
        로거_인사?.info('육아휴직 이력 삭제 완료', { period });
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success('육아휴직 이력이 삭제되었습니다.');
        } else {
            alert('육아휴직 이력이 삭제되었습니다.');
        }
        
        if (typeof showEmployeeDetail === 'function') {
            showEmployeeDetail(empId);
        }
        
    } catch (error) {
        로거_인사?.error('육아휴직 삭제 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '육아휴직 삭제 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 육아휴직 삭제 중 오류가 발생했습니다.');
        }
    }
}
