/**
 * 퇴사관리_인사.js - 프로덕션급 리팩토링
 * 
 * 퇴사 처리 및 취소
 * - 퇴사 처리 (검증 강화)
 * - 퇴사 취소 (재직 복구)
 * - 발령 이력 자동 처리
 * - 육아휴직 중 퇴사 처리
 * - 하위 호환성 (employment 객체 없는 경우)
 * 
 * @version 3.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.0 - 프로덕션급 리팩토링
 * - Phase 1 유틸리티 적용 (직원유틸, DOM유틸)
 * - 완벽한 에러 처리
 * - 체계적 로깅
 * - JSDoc 주석 추가
 * - XSS 방지
 * - 검증 강화 유지
 * - 버그 수정: emp.employment 객체 없을 때 에러 수정
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 변수 유지
 * - 전역 함수 유지
 * - employment 객체 없는 구버전 데이터 지원
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

// ===== 전역 변수 =====

/**
 * 현재 퇴사 처리 중인 직원 ID
 * @type {string|null}
 */
let currentEmployeeIdForRetire = null;

// ===== 퇴사 처리 모달 =====

/**
 * 퇴사 처리 모달 표시
 * 
 * @param {string} id - 직원 ID
 * 
 * @description
 * 퇴사 처리를 위한 모달을 표시합니다.
 * - 입사일 표시
 * - 오늘 날짜 자동 입력
 * - XSS 방지
 * 
 * @example
 * showRetireModal('employee-id'); // 모달 열기
 */
function showRetireModal(id) {
    try {
        로거_인사?.debug('퇴사 모달 열기', { id });
        
        currentEmployeeIdForRetire = id;
        
        const emp = db.findEmployee(id);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { id });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        const today = DateUtils.formatDate(new Date());
        
 // 입사일 가져오기 (하위 호환)
        const entryDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getEntryDate(emp)
            : (emp.employment?.entryDate || emp.entryDate || '-');
        
        const modalContent = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retireModal')
            : document.getElementById('retireModal');
        
        if (!modalContent) {
            로거_인사?.error('모달 컨테이너를 찾을 수 없음');
            return;
        }
        
 // XSS 방지
        const safeEntryDate = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(entryDate)
            : entryDate;
        const safeToday = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.escapeHtml(today)
            : today;
        
        modalContent.innerHTML = `
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <div class="modal-title">퇴사 처리</div>
                    <button class="modal-close" onclick="closeRetireModal()">×</button>
                </div>
                <div class="alert alert-info">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                    <span>퇴사일은 입사일(${safeEntryDate}) 이후여야 합니다.</span>
                </div>
                <div class="form-group">
                    <label>퇴사일</label>
                    <input type="date" id="retirementDate" class="form-control" value="${safeToday}">
                </div>
                <div style="display:flex;gap:10px;margin-top:20px;">
                    <button class="btn btn-warning" style="flex:1;" onclick="processRetirement()">퇴사 처리</button>
                    <button class="btn btn-secondary" onclick="closeRetireModal()">취소</button>
                </div>
            </div>
        `;
        
        modalContent.classList.add('show');
        
        로거_인사?.debug('퇴사 모달 표시 완료');
        
    } catch (error) {
        로거_인사?.error('퇴사 모달 열기 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '퇴사 모달을 여는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 퇴사 모달 닫기
 * 
 * @example
 * closeRetireModal(); // 모달 닫기
 */
function closeRetireModal() {
    try {
        currentEmployeeIdForRetire = null;
        
        const modalContent = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retireModal')
            : document.getElementById('retireModal');
        
        if (modalContent) {
            modalContent.classList.remove('show');
        }
        
        로거_인사?.debug('퇴사 모달 닫기');
        
    } catch (error) {
        로거_인사?.error('모달 닫기 실패', error);
    }
}

// ===== 퇴사 처리 =====

/**
 * 퇴사 처리 실행
 * 
 * @description
 * 직원의 퇴사를 처리합니다.
 * - 검증 1: 퇴사일 유효성 (Validator.validateRetirementDate)
 * - 검증 2: 날짜 범위 (1900~2100)
 * - 활성 발령 자동 종료
 * - 육아휴직 중 퇴사 처리
 * - 버그 수정: employment 객체 없을 때 생성
 * 
 * @example
 * processRetirement(); // 폼 데이터 검증 및 퇴사 처리
 */
function processRetirement() {
    try {
        if (!currentEmployeeIdForRetire) {
            로거_인사?.warn('퇴사 처리할 직원 ID 없음');
            return;
        }
        
        로거_인사?.info('퇴사 처리 시작', { empId: currentEmployeeIdForRetire });
        
 // ===== 입력값 수집 =====
        const retirementDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('retirementDate')
            : document.getElementById('retirementDate');
        
        if (!retirementDateField) {
            로거_인사?.error('퇴사일 입력 필드를 찾을 수 없음');
            return;
        }
        
        const retirementDate = (retirementDateField.value || '').trim();
        
        if (!retirementDate) {
            로거_인사?.warn('퇴사일 누락');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('퇴사일을 선택하세요.');
            } else {
                alert('[주의] 퇴사일을 선택하세요.');
            }
            return;
        }
        
        const emp = db.findEmployee(currentEmployeeIdForRetire);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId: currentEmployeeIdForRetire });
            
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
        
 // 입사일 가져오기 (하위 호환)
        const entryDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getEntryDate(emp)
            : (emp.employment?.entryDate || emp.entryDate);
        
        로거_인사?.debug('퇴사 정보', { name, entryDate, retirementDate });
        
 // ===== 검증: 퇴사일 유효성 검증 =====
 // validateRetirementDate에서 다음을 모두 검증:
 // - 날짜 형식 (YYYY-MM-DD)
 // - 날짜 범위 (1900~2100) - 검증_인사.js에서 처리
 // - 퇴사일이 입사일 이후인지
        const validation = Validator.validateRetirementDate(entryDate, retirementDate);
        
        if (!validation.valid) {
            로거_인사?.warn('퇴사일 검증 실패', { errors: validation.errors });
            
            const errorMsg = '[주의] 퇴사일 검증 실패:\n\n' +
                validation.errors.join('\n') +
                '\n\n입사일: ' + entryDate +
                '\n퇴사일: ' + retirementDate;
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
 // ===== 확인 메시지 =====
        const confirmMsg = `[주의] ${name} 님을 퇴사 처리하시겠습니까?\n\n입사일: ${entryDate}\n퇴사일: ${retirementDate}\n\n※ 퇴사 처리 후에도 취소할 수 있습니다.`;
        
        const confirmed = typeof 에러처리_인사 !== 'undefined'
            ? 에러처리_인사.confirm(confirmMsg)
            : confirm(confirmMsg);
        
        if (!confirmed) {
            로거_인사?.debug('퇴사 처리 취소');
            return;
        }
        
 // ===== 버그 수정: employment 객체 확보 =====
 // 구버전 데이터는 employment 객체가 없을 수 있음
        if (!emp.employment) {
            로거_인사?.debug('employment 객체 생성 (구버전 데이터)');
            
            emp.employment = {
                type: emp.employmentType || '정규직',
                status: '재직',
                entryDate: emp.entryDate || null,
                retirementDate: null
            };
        }
        
 // ===== 퇴사일 설정 =====
        emp.employment.retirementDate = retirementDate;
        emp.employment.status = '퇴사';
        
 // 하위 호환성: 구버전 필드도 업데이트
        emp.retirementDate = retirementDate;
        
        로거_인사?.debug('퇴사 정보 설정 완료');
        
 // ===== 활성 발령 종료 처리 =====
        if (emp.assignments && emp.assignments.length > 0) {
            let closedCount = 0;
            
            emp.assignments.forEach(assign => {
                if (assign.status === 'active') {
                    assign.status = 'completed';
                    assign.endDate = retirementDate;
                    closedCount++;
                }
            });
            
            if (closedCount > 0) {
                로거_인사?.debug('활성 발령 종료 처리', { count: closedCount });
            }
        }
        
 // ===== 육아휴직 중이었다면 처리 =====
        if (emp.maternityLeave?.isOnLeave) {
            로거_인사?.debug('육아휴직 중 퇴사 처리');
            
 // 복직하지 않고 퇴사한 경우
            emp.maternityLeave.isOnLeave = false;
            
 // 이력에 기록
            if (emp.maternityLeave.history && emp.maternityLeave.history.length > 0) {
                const lastIndex = emp.maternityLeave.history.length - 1;
                emp.maternityLeave.history[lastIndex].actualEndDate = null; // 복직 안함
                emp.maternityLeave.history[lastIndex].returnedAt = null;
                emp.maternityLeave.history[lastIndex].retiredWithoutReturn = true; // 복직 없이 퇴사 표시
                
                로거_인사?.debug('육아휴직 이력 업데이트', { lastIndex });
            }
        }
        
 // ===== 저장 =====
        db.saveEmployee(emp);
        
        로거_인사?.info('퇴사 처리 완료', { name, retirementDate });
        
 // ===== UI 업데이트 =====
        closeRetireModal();
        
        if (typeof closeDetailModal === 'function') {
            closeDetailModal();
        }
        
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
 // 성공 메시지
        const successMsg = `${name} 님 퇴사 처리 완료\n\n입사일: ${entryDate}\n퇴사일: ${retirementDate}\n\n[안내] 퇴사를 취소하려면 직원 상세보기에서 "퇴사 취소" 버튼을 클릭하세요.`;
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(`${name} 님 퇴사 처리 완료`);
        } else {
            alert(successMsg);
        }
        
    } catch (error) {
        로거_인사?.error('퇴사 처리 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '퇴사 처리 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 퇴사 처리 중 오류가 발생했습니다.');
        }
    }
}

// ===== 퇴사 취소 =====

/**
 * 퇴사 취소
 * 
 * @param {string} id - 직원 ID
 * 
 * @description
 * 퇴사 처리를 취소하고 재직 상태로 복구합니다.
 * - 퇴사일 제거
 * - 재직 상태로 변경
 * - 발령 상태 복구 (active로 변경)
 * - 육아휴직 중 퇴사였으면 휴직 상태 복구
 * - 버그 수정: employment 객체 없을 때 생성
 * 
 * @example
 * cancelRetirement('employee-id'); // 퇴사 취소
 */
function cancelRetirement(id) {
    try {
        로거_인사?.info('퇴사 취소 시작', { id });
        
        const emp = db.findEmployee(id);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { id });
            
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
        
        const retirementDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getRetirementDate(emp)
            : (emp.employment?.retirementDate || emp.retirementDate);
        
        로거_인사?.debug('퇴사 취소 정보', { name, retirementDate });
        
 // ===== 확인 메시지 =====
        const confirmMsg = `[주의] ${name} 님의 퇴사를 취소하시겠습니까?\n\n퇴사일: ${retirementDate}\n\n※ 재직 상태로 복구됩니다.`;
        
        const confirmed = typeof 에러처리_인사 !== 'undefined'
            ? 에러처리_인사.confirm(confirmMsg)
            : confirm(confirmMsg);
        
        if (!confirmed) {
            로거_인사?.debug('퇴사 취소 중단');
            return;
        }
        
 // ===== 버그 수정: employment 객체 확보 =====
 // 구버전 데이터는 employment 객체가 없을 수 있음
        if (!emp.employment) {
            로거_인사?.debug('employment 객체 생성 (구버전 데이터)');
            
            emp.employment = {
                type: emp.employmentType || '정규직',
                status: '재직',
                entryDate: emp.entryDate || null,
                retirementDate: null
            };
        }
        
 // ===== 퇴사 정보 제거 =====
        emp.employment.retirementDate = null;
        emp.employment.status = '재직';
        
 // 하위 호환성: 구버전 필드도 업데이트
        emp.retirementDate = null;
        
        로거_인사?.debug('퇴사 정보 제거 완료');
        
 // ===== 발령 상태 복구 =====
        if (emp.assignments && emp.assignments.length > 0) {
            let restoredCount = 0;
            
            emp.assignments.forEach(assign => {
                if (assign.endDate === retirementDate) {
                    assign.status = 'active';
                    assign.endDate = null;
                    restoredCount++;
                }
            });
            
            if (restoredCount > 0) {
                로거_인사?.debug('발령 상태 복구', { count: restoredCount });
            }
        }
        
 // ===== 육아휴직 중 퇴사 취소인 경우 =====
        if (emp.maternityLeave?.history && emp.maternityLeave.history.length > 0) {
            const lastHistory = emp.maternityLeave.history[emp.maternityLeave.history.length - 1];
            
            if (lastHistory.retiredWithoutReturn) {
                로거_인사?.debug('육아휴직 상태 복구');
                
 // 다시 육아휴직 중으로 복구
                emp.maternityLeave.isOnLeave = true;
                lastHistory.retiredWithoutReturn = false;
                lastHistory.actualEndDate = null;
                lastHistory.returnedAt = null;
            }
        }
        
 // ===== 저장 =====
        db.saveEmployee(emp);
        
        로거_인사?.info('퇴사 취소 완료', { name });
        
 // ===== UI 업데이트 =====
        if (typeof closeDetailModal === 'function') {
            closeDetailModal();
        }
        
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
 // 성공 메시지
        const successMsg = `${name} 님 퇴사 취소 완료\n\n재직 상태로 복구되었습니다.`;
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(`${name} 님 퇴사 취소 완료`);
        } else {
            alert(successMsg);
        }
        
    } catch (error) {
        로거_인사?.error('퇴사 취소 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '퇴사 취소 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 퇴사 취소 중 오류가 발생했습니다.');
        }
    }
}
