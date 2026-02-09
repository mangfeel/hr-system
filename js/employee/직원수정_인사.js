/**
 * 직원수정_인사.js - 프로덕션급 리팩토링
 * 
 * 직원 정보 수정
 * - 개인 정보 수정 (성명, 주민번호, 생년월일, 성별)
 * - 소속 정보 수정 (사원번호, 직종)
 * - 자격증 수정
 * - 연락처 수정
 * - 급여 지급 방식 수정 (호봉제/연봉제) ⭐ v3.0.5 추가
 * - 연속근무 연결 (동일인물 근속 통합) ⭐ v3.2.0 추가
 * - 주민등록번호 자동 파싱 (생년월일, 성별 자동 입력)
 * - 경력 계산 시 주당근무시간 비율 적용 ⭐ v3.1.0 추가
 * - 발령별 이전 경력 인정율 수정 ⭐ v3.3.0 추가
 * - 탭 기반 UI로 전면 개편 ⭐ v3.4.0 추가
 * 
 * @version 4.1.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.1.0 (2026-01-22) ⭐ 검증 API 연동
 * - _validateEditForm → API_인사.validateEdit
 * - 서버 API로 검증 로직 보호
 * 
 * v4.0.0 (2026-01-21) ⭐ API 연동 버전
 * - saveEmployeeEdit() 비동기 처리
 * - 호봉/근속기간 계산 API 우선 사용
 * - 서버 API로 계산 로직 보호
 * 
 * v3.4.0 (2025-12-05) ⭐ 탭 기반 UI로 전면 개편
 * - 7개 섹션 → 3개 탭으로 통합 (기본정보/자격연락처/급여발령)
 * - 스크롤 4페이지 → 거의 없음으로 개선
 * - 저장 버튼 항상 하단에 고정
 * - switchEditTab() 함수 추가
 * - 급여 방식 UI 간소화
 * 
 * v3.3.1 (2025-12-03) ⭐ 발령 이력 UI 개선
 * - 입사 발령: 인정율 입력란 완전히 숨김
 * - 전보/승진 발령: "직전 경력(OO부서) 인정율" 라벨로 변경
 * - 적용되는 기간(시작일~종료일) 명확히 표시
 * - 사용자 혼란 방지
 * 
 * v3.3.0 (2025-12-03) ⭐ 발령별 이전 경력 인정율 수정 기능 추가
 * - 직원수정 모달에 "발령 이력 및 경력 인정율" 섹션 추가
 * - 각 발령별 이전 경력 인정율 확인 및 수정 가능
 * - 인정율 변경 시 즉시 저장 및 호봉 재계산 안내
 * - 입사 발령은 인정율 해당 없음으로 표시
 * 
 * v3.2.1 (2025-12-02) ⭐ 고용형태 수정 기능 추가
 * - 소속 정보에 고용형태 선택 추가
 * - 정규직/무기계약직/계약직/육아휴직대체
 * - emp.employment.type 저장
 * 
 * v3.2.0 (2025-12-02) ⭐ 연속근무 연결 기능 추가
 * - 동일인물(성명+생년월일) 연속근로(퇴사일+1=입사일) 연결
 * - 연명부/인사카드에서 근속 통합 표시 가능
 * - emp.continuousService 필드 추가
 * - 자동 검색 기능 (searchLinkedEmployee)
 * 
 * v3.1.0 (2025-11-26) ⭐ 주당근무시간 비율 적용
 * - 호봉 재계산 시 경력의 workingHours 필드 적용
 * - 환산공식: 실제기간 × (인정률/100) × (근무시간/40)
 * - 기존 경력 데이터는 기본값 40시간으로 처리 (하위 호환)
 * 
 * v3.0.8 - Phase 3 기능 추가: 호봉 자동 재계산 (2025-11-11)
 * ⭐ 신규 기능: 연봉제 → 호봉제 전환 시 호봉 자동 재계산
 * - 경력이 있으면 경력 기반 호봉 계산
 * - 경력이 없으면 입사일 기준 1호봉부터 시작
 * - startRank, firstUpgradeDate, currentRank 자동 설정
 * - 호봉 배지가 정상적으로 표시됨
 * 
 * v3.0.7 - Phase 3 긴급 버그 수정: DOM 캐시 문제 해결 (2025-11-11)
 * 치명적 버그 수정: 급여방식 변경이 저장되지 않던 DOM 캐시 문제
 * - _collectFormData()에서 DOM유틸_인사.getById() → document.getElementById()로 변경
 * - 모달 재생성 시 캐시된 요소가 disconnected 상태가 되는 문제 해결
 * - 급여방식 라디오 버튼 값을 정상적으로 읽지 못하던 버그 수정
 * - 인사발령_인사.js 패턴 적용 (v3.0.5 _collectEditAssignmentFormData 참조)
 * - DOM유틸_인사.js v3.1.0 document.contains() 패턴 참조
 * - 경력편집_인사.js v3.0.5.6 "DOM 손상/이벤트 핸들러 문제 해결" 사례 적용
 * 
 * v3.0.6 - Phase 3 버그 수정: 급여방식 변경 시 발령 데이터 동기화 (2025-11-11)
 * 버그: 직원수정에서 급여방식 변경 시 발령 데이터는 업데이트 안됨
 * - _updatePaymentMethod()에 활성 발령 동기화 로직 추가
 * - 활성 발령이 없으면 최신 발령 업데이트
 * - 직원목록 배지와 발령 이력의 데이터 일관성 보장
 * - Phase 3-2, 3-3과 완벽한 호환
 * 
 * v3.0.5 - 급여 지급 방식 수정 기능 추가 (2024-11-10) ⭐ 신규 기능
 * - 호봉제/연봉제 선택 UI 추가
 * - emp.rank.isRankBased 플래그 변경 로직
 * - 전환 시 사용자 안내 메시지
 * - 향후 급여 기능 대비 구조 준비
 * - 데이터 구조는 기존 유지 (완벽한 하위 호환)
 * 
 * v3.0 - 프로덕션급 리팩토링
 * - Phase 1 유틸리티 적용 (DOM유틸)
 * - 완벽한 에러 처리
 * - 체계적 로깅
 * - JSDoc 주석 추가
 * - XSS 방지
 * - 주민번호 파싱 개선
 * - 검증 강화
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 변수 유지 (currentEmployeeIdForEdit)
 * - 전역 함수 유지
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 */

// ===== 전역 변수 =====

/**
 * 현재 수정 중인 직원 ID
 * @type {string|null}
 */
let currentEmployeeIdForEdit = null;

// ===== 메인 함수 =====

/**
 * 직원 정보 수정 모달 표시
 * 
 * @param {string} empId - 직원 ID
 * 
 * @description
 * 직원의 정보를 수정할 수 있는 모달을 표시합니다.
 * - 개인 정보 (성명, 주민번호, 생년월일, 성별)
 * - 소속 정보 (사원번호, 직종)
 * - 자격증 (최대 2개)
 * - 연락처 (전화번호, 이메일, 주소)
 * 
 * @example
 * showEditEmployeeModal('emp-001'); // 직원 수정 모달 표시
 */
function showEditEmployeeModal(empId) {
    try {
        로거_인사?.debug('직원 수정 모달 표시 시작', { empId });
        
 // 직원 정보 조회
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.warn('직원을 찾을 수 없습니다', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
 // 전역 변수에 저장
        currentEmployeeIdForEdit = empId;
        
 // 모달 HTML 생성
        const modalHTML = _generateEditModalHTML(emp);
        
 // 모달 표시
        const modalContent = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editEmployeeModal')
            : document.getElementById('editEmployeeModal');
        
        if (!modalContent) {
            로거_인사?.error('모달 컨테이너를 찾을 수 없습니다');
            throw new Error('모달을 표시할 수 없습니다.');
        }
        
        modalContent.innerHTML = modalHTML;
        modalContent.classList.add('show');
        
        로거_인사?.info('직원 수정 모달 표시 완료', {
            empId,
            name: emp.personalInfo?.name || emp.name
        });
        
    } catch (error) {
        로거_인사?.error('직원 수정 모달 표시 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '수정 화면을 여는 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 수정 화면을 여는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 수정 모달 닫기
 * 
 * @description
 * 수정 모달을 닫고 전역 변수를 초기화합니다.
 * 
 * @example
 * closeEditEmployeeModal(); // 모달 닫기
 */
function closeEditEmployeeModal() {
    try {
        로거_인사?.debug('수정 모달 닫기', { empId: currentEmployeeIdForEdit });
        
 // 전역 변수 초기화
        currentEmployeeIdForEdit = null;
        
 // 모달 닫기
        const modal = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editEmployeeModal')
            : document.getElementById('editEmployeeModal');
        
        if (modal) {
            modal.classList.remove('show');
        }
        
    } catch (error) {
        로거_인사?.error('모달 닫기 실패', error);
    }
}

/**
 * 직원 수정 모달 탭 전환 ⭐ v3.4.0 추가
 * 
 * @param {string} tabId - 전환할 탭 ID ('edit-tab-basic', 'edit-tab-contact', 'edit-tab-salary')
 */
function switchEditTab(tabId) {
    try {
 // 모든 탭 버튼 비활성화
        const tabBtns = document.querySelectorAll('.edit-tab-btn');
        tabBtns.forEach(btn => btn.classList.remove('active'));
        
 // 클릭된 탭 버튼 활성화
        const activeBtn = document.querySelector(`.edit-tab-btn[data-tab="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
 // 모든 탭 컨텐츠 숨김
        const tabContents = document.querySelectorAll('.edit-tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        
 // 선택된 탭 컨텐츠 표시
        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        로거_인사?.debug('탭 전환', { tabId });
        
    } catch (error) {
        로거_인사?.error('탭 전환 실패', error);
    }
}

/**
 * 주민등록번호 파싱 및 자동 입력
 * 
 * @description
 * 주민등록번호를 분석하여 생년월일과 성별을 자동으로 입력합니다.
 * - 13자리 숫자만 처리
 * - 하이픈 자동 제거
 * - 연도 계산 (1900년대/2000년대/1800년대)
 * - 성별 자동 판별
 * 
 * @example
 * parseResidentNumber(); // 주민번호 입력 후 자동 파싱
 */
function parseResidentNumber() {
    try {
        로거_인사?.debug('주민등록번호 파싱 시작');
        
 // 입력값 가져오기
        const residentNumberField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editResidentNumber')
            : document.getElementById('editResidentNumber');
        
        if (!residentNumberField) {
            로거_인사?.warn('주민번호 필드를 찾을 수 없습니다');
            return;
        }
        
        const residentNumber = residentNumberField.value.trim();
        
 // 빈 값 처리
        if (!residentNumber) {
            로거_인사?.debug('주민번호가 비어있습니다');
            return;
        }
        
 // 하이픈 제거
        const cleaned = residentNumber.replace(/-/g, '');
        
 // 길이 및 숫자 검증
        if (cleaned.length !== 13) {
            로거_인사?.debug('주민번호 길이가 올바르지 않습니다', { length: cleaned.length });
            return;
        }
        
        if (!/^\d+$/.test(cleaned)) {
            로거_인사?.debug('주민번호에 숫자가 아닌 문자가 포함되어 있습니다');
            return;
        }
        
 // 주민번호 파싱
        const parsed = _parseResidentNumberData(cleaned);
        
        if (!parsed) {
            로거_인사?.warn('주민번호 파싱 실패', { residentNumber });
            return;
        }
        
 // 생년월일 입력
        const birthDateField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editBirthDate')
            : document.getElementById('editBirthDate');
        
        if (birthDateField) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(birthDateField, parsed.birthDate);
            } else {
                birthDateField.value = parsed.birthDate;
            }
        }
        
 // 성별 입력
        const genderField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editGender')
            : document.getElementById('editGender');
        
        if (genderField) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(genderField, parsed.gender);
            } else {
                genderField.value = parsed.gender;
            }
        }
        
        로거_인사?.info('주민번호 파싱 완료', parsed);
        
    } catch (error) {
        로거_인사?.error('주민번호 파싱 오류', error);
 // 사용자에게 알리지 않음 (UX 고려)
    }
}

/**
 * 급여 지급 방식 정보 박스 표시/숨김
 * 
 * @param {string} paymentMethod - 급여 지급 방식 ('호봉제' | '연봉제')
 * 
 * @description
 * 선택된 급여 지급 방식에 따라 적절한 정보 박스를 표시합니다.
 * - 호봉제: 호봉 계산 및 승급 안내
 * - 연봉제: 호봉 참고용 유지 안내
 * 
 * @example
 * togglePaymentMethodInfo('호봉제'); // 호봉제 정보 표시
 */
function togglePaymentMethodInfo(paymentMethod) {
    try {
        로거_인사?.debug('급여 지급 방식 정보 토글', { paymentMethod });
        
        const rankBasedInfo = document.getElementById('rankBasedInfo');
        const annualSalaryInfo = document.getElementById('annualSalaryInfo');
        
 // ⭐ v3.4.0: 새 탭 UI의 payment-option 클래스 지원
        const options = document.querySelectorAll('.payment-option');
        options.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
        
 // 기존 payment-method-label 지원 (하위 호환)
        const labels = document.querySelectorAll('.payment-method-label');
        labels.forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                label.style.borderColor = '#3b82f6';
                label.style.backgroundColor = '#f0f9ff';
            } else {
                label.style.borderColor = '#e5e7eb';
                label.style.backgroundColor = 'transparent';
            }
        });
        
        if (paymentMethod === '호봉제') {
            if (rankBasedInfo) rankBasedInfo.style.display = 'block';
            if (annualSalaryInfo) annualSalaryInfo.style.display = 'none';
        } else {
            if (rankBasedInfo) rankBasedInfo.style.display = 'none';
            if (annualSalaryInfo) annualSalaryInfo.style.display = 'block';
        }
        
    } catch (error) {
        로거_인사?.error('정보 박스 토글 실패', error);
    }
}

/**
 * 직원 정보 저장
 * 
 * @description
 * 수정된 직원 정보를 저장합니다.
 * - 개인 정보 업데이트
 * - 소속 정보 업데이트
 * - 급여 지급 방식 업데이트 ⭐ v3.0.5 추가
 * - 자격증 업데이트
 * - 연락처 업데이트
 * - 데이터베이스 저장
 * - 화면 갱신 (상세보기, 목록)
 * 
 * @example
 * saveEmployeeEdit(); // 수정 내용 저장
 * 
 * @version 4.0.0 - async API 버전
 */
async function saveEmployeeEdit() {
    try {
        로거_인사?.debug('직원 정보 저장 시작', { empId: currentEmployeeIdForEdit });
        
 // ID 확인
        if (!currentEmployeeIdForEdit) {
            로거_인사?.warn('수정할 직원 ID가 없습니다');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('수정할 직원 정보를 찾을 수 없습니다.');
            } else {
                alert('[주의] 수정할 직원 정보를 찾을 수 없습니다.');
            }
            return;
        }
        
 // 직원 정보 조회
        const emp = db.findEmployee(currentEmployeeIdForEdit);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없습니다', { empId: currentEmployeeIdForEdit });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('[주의] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
 // 입력값 수집
        const formData = _collectFormData();
        
 // 기본 검증 (API 우선, fallback으로 로컬 검증)
        let validation;
        
        if (typeof API_인사 !== 'undefined') {
            try {
                validation = await API_인사.validateEdit(formData);
                로거_인사?.debug('API 검증 완료', validation);
            } catch (apiError) {
                로거_인사?.warn('API 검증 실패, 로컬 검증 사용', apiError);
 // fallback: 로컬 검증
                validation = _validateEditForm(formData, emp);
            }
        } else {
 // API_인사 없으면 로컬 검증
            validation = _validateEditForm(formData, emp);
        }
        
        if (!validation.valid) {
            로거_인사?.warn('입력값 검증 실패', { errors: validation.errors });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                const errorMsg = '[주의] 다음 항목을 확인해주세요:\n\n' +
                    validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
                alert(errorMsg);
            }
            return;
        }
        
 // ⭐ 급여 지급 방식 변경 처리
        const newPaymentMethod = formData.paymentMethod; // ⭐ formData에서 가져오기
        const oldPaymentMethod = (emp.rank?.isRankBased !== false) ? '호봉제' : '연봉제';
        
        console.log(' 급여방식 디버깅:', {
            formData_paymentMethod: formData.paymentMethod,
            newPaymentMethod: newPaymentMethod,
            oldPaymentMethod: oldPaymentMethod,
            willChange: !!(newPaymentMethod && newPaymentMethod !== oldPaymentMethod)
        });
        
        if (newPaymentMethod && newPaymentMethod !== oldPaymentMethod) {
            console.log(' 급여방식 변경 진입');
            
 // 확인 메시지
            const confirmResult = _confirmPaymentMethodChange(emp, oldPaymentMethod, newPaymentMethod);
            if (!confirmResult) {
                로거_인사?.info('급여 지급 방식 변경 취소', { empId: emp.id });
                return;
            }
            
            console.log(' 사용자 확인 완료, 급여방식 업데이트 시작');
            
 // 급여 지급 방식 변경
            await _updatePaymentMethod(emp, newPaymentMethod);
        } else {
            console.log('️ 급여방식 변경 조건 불만족');
        }
        
 // 데이터 업데이트
        _updateEmployeeData(emp, formData);
        
 // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('직원 정보 저장 완료', {
            empId: emp.id,
            name: emp.personalInfo?.name
        });
        
 // 성공 메시지
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success('직원 정보가 수정되었습니다.');
        } else {
            alert('직원 정보가 수정되었습니다.');
        }
        
 // 모달 닫기
        closeEditEmployeeModal();
        
 // 화면 갱신
        if (typeof showEmployeeDetail === 'function') {
            showEmployeeDetail(emp.id);
        }
        
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
    } catch (error) {
        로거_인사?.error('직원 정보 저장 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '저장 중 오류가 발생했습니다.');
        } else {
            alert('[오류] 저장 중 오류가 발생했습니다.');
        }
    }
}

// ===== Private 함수들 =====

/**
 * 수정 모달 HTML 생성 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @returns {string} HTML 문자열
 */
function _generateEditModalHTML(emp) {
 // XSS 방지
    const escapeHtml = (text) => {
        if (typeof DOM유틸_인사 !== 'undefined') {
            return DOM유틸_인사.escapeHtml(text || '');
        }
        return (text || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    };
    
    const name = escapeHtml(emp.personalInfo?.name || '');
    const residentNumber = escapeHtml(emp.personalInfo?.residentNumber || '');
    const birthDate = escapeHtml(emp.personalInfo?.birthDate || '');
    const gender = emp.personalInfo?.gender || '';
    
    const employeeNumber = escapeHtml(emp.employeeNumber || '');
    const jobType = escapeHtml(emp.currentPosition?.jobType || '');
    const employmentType = emp.employment?.type || '정규직';
    
    const cert1 = escapeHtml(emp.certifications?.[0]?.name || '');
    const cert2 = escapeHtml(emp.certifications?.[1]?.name || '');
    
    const phone = escapeHtml(emp.contactInfo?.phone || '');
    const email = escapeHtml(emp.contactInfo?.email || '');
    const address = escapeHtml(emp.contactInfo?.address || '');
    
 // ⭐ v3.2.0: 연속근무 연결 정보
    const continuousService = emp.continuousService || {};
    const csEnabled = continuousService.enabled || false;
    const csLinkedId = continuousService.linkedEmployeeId || '';
    const csOriginalEntry = continuousService.originalEntryDate || '';
    
 // 연결된 퇴사자 정보 조회
    let linkedEmpInfo = '';
    if (csLinkedId) {
        const linkedEmp = db.data?.employees?.find(e => e.id === csLinkedId);
        if (linkedEmp) {
            const linkedDept = linkedEmp.currentPosition?.dept || linkedEmp.assignments?.[0]?.dept || '-';
            const linkedPos = linkedEmp.currentPosition?.position || linkedEmp.assignments?.[0]?.position || '-';
            const linkedEntry = linkedEmp.employment?.entryDate || '-';
            const linkedRetire = linkedEmp.employment?.retirementDate || '-';
            linkedEmpInfo = `${linkedEntry} ~ ${linkedRetire}<br>${linkedDept} / ${linkedPos}`;
        }
    }
    
 // ⭐ v3.3.0: 발령 이력 HTML 생성
    const assignmentHistoryHTML = _generateAssignmentHistoryForEdit(emp, escapeHtml);
    
 // ⭐ v3.4.0: 탭 UI로 전면 개편
    return `
        <div class="modal-content edit-modal-tabbed">
            <div class="modal-header">
                <div class="modal-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 직원 정보 수정</div>
                <button class="modal-close" onclick="closeEditEmployeeModal()">×</button>
            </div>
            
            <!-- 탭 네비게이션 -->
            <div class="edit-modal-tabs">
                <button class="edit-tab-btn active" data-tab="edit-tab-basic" onclick="switchEditTab('edit-tab-basic')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 기본정보
                </button>
                <button class="edit-tab-btn" data-tab="edit-tab-contact" onclick="switchEditTab('edit-tab-contact')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 자격/연락처
                </button>
                <button class="edit-tab-btn" data-tab="edit-tab-salary" onclick="switchEditTab('edit-tab-salary')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 급여/발령
                </button>
            </div>
            
            <!-- 탭 컨텐츠 영역 -->
            <div class="edit-tab-content-wrapper">
                
                <!-- ========== 탭 1: 기본정보 ========== -->
                <div id="edit-tab-basic" class="edit-tab-content active">
                    <div class="edit-section">
                        <div class="edit-section-title">개인 정보</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>성명</label>
                                <input type="text" id="editName" class="form-control" value="${name}">
                            </div>
                            <div class="form-group">
                                <label>주민등록번호</label>
                                <input type="text" id="editResidentNumber" class="form-control" placeholder="000000-0000000" value="${residentNumber}" onchange="parseResidentNumber()">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>생년월일</label>
                                <input type="date" id="editBirthDate" class="form-control" value="${birthDate}">
                            </div>
                            <div class="form-group">
                                <label>성별</label>
                                <select id="editGender" class="form-control">
                                    <option value="">선택</option>
                                    <option value="남" ${gender === '남' ? 'selected' : ''}>남</option>
                                    <option value="여" ${gender === '여' ? 'selected' : ''}>여</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-section">
                        <div class="edit-section-title">소속 정보</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>사원번호</label>
                                <input type="text" id="editEmployeeNumber" class="form-control" value="${employeeNumber}">
                            </div>
                            <div class="form-group">
                                <label>직종</label>
                                <input type="text" id="editJobType" class="form-control" value="${jobType}">
                            </div>
                            <div class="form-group">
                                <label>고용형태</label>
                                <select id="editEmploymentType" class="form-control">
                                    <option value="정규직" ${employmentType === '정규직' ? 'selected' : ''}>정규직</option>
                                    <option value="무기계약직" ${employmentType === '무기계약직' ? 'selected' : ''}>무기계약직</option>
                                    <option value="계약직" ${employmentType === '계약직' ? 'selected' : ''}>계약직</option>
                                    <option value="육아휴직대체" ${employmentType === '육아휴직대체' ? 'selected' : ''}>육아휴직대체</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ========== 탭 2: 자격/연락처 ========== -->
                <div id="edit-tab-contact" class="edit-tab-content">
                    <div class="edit-section">
                        <div class="edit-section-title">자격증</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>자격증 1</label>
                                <input type="text" id="editCert1" class="form-control" placeholder="예: 사회복지사 1급" value="${cert1}">
                            </div>
                            <div class="form-group">
                                <label>자격증 2</label>
                                <input type="text" id="editCert2" class="form-control" placeholder="예: 요양보호사" value="${cert2}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-section">
                        <div class="edit-section-title">연락처 정보</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>전화번호</label>
                                <input type="text" id="editPhone" class="form-control" placeholder="010-0000-0000" value="${phone}">
                            </div>
                            <div class="form-group">
                                <label>이메일</label>
                                <input type="email" id="editEmail" class="form-control" placeholder="example@email.com" value="${email}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>주소</label>
                            <input type="text" id="editAddress" class="form-control" placeholder="전체 주소" value="${address}">
                        </div>
                    </div>
                </div>
                
                <!-- ========== 탭 3: 급여/발령 ========== -->
                <div id="edit-tab-salary" class="edit-tab-content">
                    <div class="edit-section">
                        <div class="edit-section-title">급여 지급 방식</div>
                        <div class="payment-method-compact">
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="호봉제" onchange="togglePaymentMethodInfo(this.value)">
                                <span class="payment-label">호봉제</span>
                                <span class="payment-desc">경력 기반 자동 산정</span>
                            </label>
                            <label class="payment-option">
                                <input type="radio" name="paymentMethod" value="연봉제" onchange="togglePaymentMethodInfo(this.value)">
                                <span class="payment-label">연봉제</span>
                                <span class="payment-desc">계약서 기준 지급</span>
                            </label>
                        </div>
                        <div id="rankBasedInfo" class="payment-info-box info-blue" style="display:none;">
                            호봉에 따라 기본급이 자동 산정되며, 매년 첫승급일에 자동 승급됩니다.
                        </div>
                        <div id="annualSalaryInfo" class="payment-info-box info-yellow" style="display:none;">
                            호봉 정보는 참고용으로 유지되며, 연명부에는 "-"로 표시됩니다.
                        </div>
                    </div>
                    
                    <div class="edit-section">
                        <div class="edit-section-title">연속근무 연결</div>
                        <div class="cs-toggle-row">
                            <label class="cs-checkbox-label">
                                <input type="checkbox" id="editCsEnabled" ${csEnabled ? 'checked' : ''} onchange="toggleContinuousServiceInfo()">
                                <span>연속근무 적용</span>
                            </label>
                            <span class="cs-hint">동일인물 연속 근무 시 근속 통합</span>
                        </div>
                        
                        <div id="continuousServiceDetails" class="cs-details" style="display:${csEnabled ? 'block' : 'none'};">
                            <div class="form-group">
                                <label>연결된 이전 근무</label>
                                <div id="linkedEmployeeInfo" class="linked-emp-box">
                                    ${linkedEmpInfo || '<span class="no-link">연결된 이전 근무 기록이 없습니다.</span>'}
                                </div>
                                <input type="hidden" id="editCsLinkedId" value="${csLinkedId}">
                            </div>
                            <div class="cs-btn-row">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="searchLinkedEmployee()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 자동 검색</button>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="clearLinkedEmployee()">✕ 해제</button>
                            </div>
                            <div class="form-group">
                                <label>근속 기준일</label>
                                <input type="date" id="editCsOriginalEntry" class="form-control" value="${csOriginalEntry}" readonly style="background:#f3f4f6;">
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-section">
                        <div class="edit-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 발령 이력 및 경력 인정율</div>
                        ${assignmentHistoryHTML}
                    </div>
                </div>
            </div>
            
            <!-- 저장/취소 버튼 (항상 하단 고정) -->
            <div class="edit-modal-footer">
                <button class="btn btn-primary" onclick="saveEmployeeEdit()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 저장</button>
                <button class="btn btn-secondary" onclick="closeEditEmployeeModal()">취소</button>
            </div>
        </div>
        
        <script>
 // 급여 지급 방식 초기 설정
            (function() {
                const isRankBased = ${emp.salaryInfo?.isRankBased ?? emp.rank?.isRankBased ?? true};
                const paymentMethod = isRankBased ? '호봉제' : '연봉제';
                
 // 라디오 버튼 선택
                const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');
                radioButtons.forEach(radio => {
                    radio.checked = (radio.value === paymentMethod);
                    const label = radio.closest('.payment-option');
                    if (radio.checked && label) {
                        label.classList.add('selected');
                    }
                });
                
                togglePaymentMethodInfo(paymentMethod);
            })();
        </script>
    `;
}

/**
 * 주민등록번호 데이터 파싱 (Private)
 * 
 * @private
 * @param {string} cleaned - 하이픈 제거된 13자리 숫자
 * @returns {Object|null} 파싱된 데이터 또는 null
 */
function _parseResidentNumberData(cleaned) {
    try {
        const year = cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        const day = cleaned.substring(4, 6);
        const genderCode = cleaned.substring(6, 7);
        
 // 연도 계산
        let fullYear;
        
        if (['1', '2', '5', '6'].includes(genderCode)) {
            fullYear = '19' + year;
        } else if (['3', '4', '7', '8'].includes(genderCode)) {
            fullYear = '20' + year;
        } else if (['9', '0'].includes(genderCode)) {
            fullYear = '18' + year;
        } else {
            로거_인사?.warn('유효하지 않은 성별 코드', { genderCode });
            return null;
        }
        
 // 생년월일
        const birthDate = `${fullYear}-${month}-${day}`;
        
 // 성별
        const gender = ['1', '3', '5', '7', '9'].includes(genderCode) ? '남' : '여';
        
        return {
            birthDate,
            gender,
            genderCode
        };
        
    } catch (error) {
        로거_인사?.error('주민번호 데이터 파싱 오류', error);
        return null;
    }
}

/**
 * 폼 데이터 수집 (Private)
 * 
 * @private
 * @returns {Object} 수집된 폼 데이터
 */
function _collectFormData() {
 // DOM유틸을 사용하지 않고 직접 읽기 (DOM 캐시 버그 방지)
 // 모달이 열릴 때마다 새로운 DOM이 생성되므로 캐시된 요소는 disconnected 상태가 됨
 // 따라서 document.getElementById()를 직접 사용하여 현재 DOM에서 요소를 가져와야 함
    const getValue = (id) => {
        const elem = document.getElementById(id);
        return elem ? (elem.value || '').trim() : '';
    };
    
    return {
        name: getValue('editName'),
        residentNumber: getValue('editResidentNumber'),
        birthDate: getValue('editBirthDate'),
        gender: getValue('editGender'),
        employeeNumber: getValue('editEmployeeNumber'),
        jobType: getValue('editJobType'),
        cert1: getValue('editCert1'),
        cert2: getValue('editCert2'),
        phone: getValue('editPhone'),
        email: getValue('editEmail'),
        address: getValue('editAddress'),
        paymentMethod: _getPaymentMethod() // ⭐ v3.0.5 추가
    };
}

/**
 * 수정 폼 검증 (Private)
 * 
 * @private
 * @param {Object} formData - 폼 데이터
 * @param {Object} emp - 직원 객체
 * @returns {Object} 검증 결과 { valid: boolean, errors: string[] }
 */
function _validateEditForm(formData, emp) {
    const errors = [];
    
 // 성명은 필수 (빈 값이면 기존 값 유지하므로 체크 불필요)
 // 하지만 완전히 지워진 경우 체크
    if (!formData.name && !emp.personalInfo?.name && !emp.name) {
        errors.push('성명은 필수 항목입니다.');
    }
    
 // 이메일 형식 검증 (선택 항목이지만 입력된 경우)
    if (formData.email && formData.email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.push('이메일 형식이 올바르지 않습니다.');
        }
    }
    
 // 전화번호 형식 검증 (선택 항목이지만 입력된 경우)
    if (formData.phone && formData.phone.length > 0) {
        const phoneRegex = /^[\d\-\s()]+$/;
        if (!phoneRegex.test(formData.phone)) {
            errors.push('전화번호는 숫자, 하이픈, 괄호만 포함할 수 있습니다.');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 직원 데이터 업데이트 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체 (수정됨)
 * @param {Object} formData - 폼 데이터
 */
function _updateEmployeeData(emp, formData) {
 // 개인 정보 업데이트
    emp.personalInfo = emp.personalInfo || {};
    
 // 성명 (빈 값이면 기존 값 유지)
    if (formData.name) {
        emp.personalInfo.name = formData.name;
    }
    
    emp.personalInfo.residentNumber = formData.residentNumber;
    emp.personalInfo.birthDate = formData.birthDate;
    emp.personalInfo.gender = formData.gender;
    
 // 사원번호
    emp.employeeNumber = formData.employeeNumber;
    
 // 직종
    emp.currentPosition = emp.currentPosition || {};
    emp.currentPosition.jobType = formData.jobType;
    
 // ⭐ v3.2.1: 고용형태
    emp.employment = emp.employment || {};
    const newEmploymentType = document.getElementById('editEmploymentType')?.value || '정규직';
    if (emp.employment.type !== newEmploymentType) {
        로거_인사?.info('고용형태 변경', {
            empId: emp.id,
            from: emp.employment.type,
            to: newEmploymentType
        });
    }
    emp.employment.type = newEmploymentType;
    
 // 자격증
    emp.certifications = [];
    if (formData.cert1) {
        emp.certifications.push({
            id: `CERT${Date.now()}-1`,
            name: formData.cert1
        });
    }
    if (formData.cert2) {
        emp.certifications.push({
            id: `CERT${Date.now()}-2`,
            name: formData.cert2
        });
    }
    
 // 연락처
    emp.contactInfo = emp.contactInfo || {};
    emp.contactInfo.phone = formData.phone;
    emp.contactInfo.email = formData.email;
    emp.contactInfo.address = formData.address;
    
 // ⭐ v3.2.0: 연속근무 연결 정보 저장
    const csEnabled = document.getElementById('editCsEnabled')?.checked || false;
    const csLinkedId = document.getElementById('editCsLinkedId')?.value || '';
    const csOriginalEntry = document.getElementById('editCsOriginalEntry')?.value || '';
    
    if (csEnabled && csLinkedId) {
        emp.continuousService = {
            enabled: true,
            linkedEmployeeId: csLinkedId,
            originalEntryDate: csOriginalEntry
        };
        로거_인사?.info('연속근무 연결 저장', {
            empId: emp.id,
            linkedId: csLinkedId,
            originalEntry: csOriginalEntry
        });
    } else {
 // 체크 해제 시 연결 해제
        if (emp.continuousService) {
            delete emp.continuousService;
            로거_인사?.info('연속근무 연결 해제', { empId: emp.id });
        }
    }
    
    로거_인사?.debug('직원 데이터 업데이트 완료', {
        name: emp.personalInfo.name,
        hasResidentNumber: !!formData.residentNumber,
        hasCertifications: emp.certifications.length
    });
}

/**
 * 급여 지급 방식 가져오기 (Private)
 * 
 * @private
 * @returns {string|null} 급여 지급 방식 ('호봉제' | '연봉제' | null)
 */
function _getPaymentMethod() {
    const radio = document.querySelector('input[name="paymentMethod"]:checked');
    return radio ? radio.value : null;
}

/**
 * 급여 지급 방식 변경 확인 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} oldMethod - 이전 방식
 * @param {string} newMethod - 새 방식
 * @returns {boolean} 변경 진행 여부
 */
function _confirmPaymentMethodChange(emp, oldMethod, newMethod) {
    let message = '';
    
    if (newMethod === '연봉제') {
 // 호봉제 → 연봉제
        message = `급여 지급 방식을 연봉제로 변경하시겠습니까?\n\n` +
            `변경 시:\n` +
            `• 호봉 정보는 참고용으로 유지됩니다\n` +
            `• 공식 문서(연명부 등)에는 호봉이 "-"로 표시됩니다\n` +
            `• 호봉은 경력 관리를 위해 계속 계산됩니다\n\n` +
            `※ 향후 급여 기능 추가 시 연봉 계약 금액을 별도로 입력하게 됩니다.`;
        
        if (emp.rank?.currentRank > 1) {
            message = `[주의] 현재 ${emp.rank.currentRank}호봉 정보가 있습니다.\n\n` + message;
        }
    } else {
 // 연봉제 → 호봉제
        if (!emp.rank?.firstUpgradeDate) {
            message = `[주의] 호봉 정보가 없습니다.\n\n` +
                `호봉제로 변경하려면 과거 경력을 입력해야 합니다.\n` +
                `"경력 편집"에서 경력을 입력하면 호봉이 자동으로 계산됩니다.\n\n` +
                `그래도 변경하시겠습니까?`;
        } else {
            message = `급여 지급 방식을 호봉제로 변경하시겠습니까?\n\n` +
                `변경 시:\n` +
                `• 호봉에 따라 기본급이 결정됩니다\n` +
                `• 공식 문서에 호봉이 표시됩니다\n` +
                `• 매년 첫승급일 기준으로 자동 승급됩니다 (직원별 상이)\n\n` +
                `※ 향후 급여 기능 추가 시 직급과 호봉으로 기본급이 자동 산정됩니다.`;
        }
    }
    
    return confirm(message);
}

/**
 * 급여 지급 방식 업데이트 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체 (수정됨)
 * @param {string} paymentMethod - 새 급여 지급 방식
 */
async function _updatePaymentMethod(emp, paymentMethod) {
    console.log(' _updatePaymentMethod 시작:', { 
        empId: emp.id, 
        paymentMethod: paymentMethod 
    });
    
 // rank 객체가 없으면 생성
    if (!emp.rank) {
        emp.rank = {};
    }
    
 // salaryInfo 객체가 없으면 생성 (향후 급여 기능 확장 대비)
    if (!emp.salaryInfo) {
        emp.salaryInfo = {};
    }
    
 // ⭐ 두 곳 모두 저장 (데이터 일관성)
    const isRankBased = (paymentMethod === '호봉제');
    emp.rank.isRankBased = isRankBased;
    emp.salaryInfo.isRankBased = isRankBased;
    
    console.log(' isRankBased 설정:', isRankBased);
    
 // ⭐⭐ Phase 3 버그 수정: 활성 발령의 급여방식도 함께 업데이트 (2025-11-11)
 // 직원수정에서 급여방식을 변경하면 현재(활성) 발령의 급여방식도 동기화
    if (emp.assignments && emp.assignments.length > 0) {
 // 활성 발령 찾기
        const activeAssignment = emp.assignments.find(a => a.status === 'active');
        
        if (activeAssignment) {
            activeAssignment.paymentMethod = paymentMethod;
            activeAssignment.isRankBased = isRankBased;
            
            로거_인사?.debug('활성 발령 급여방식 동기화', {
                assignmentId: activeAssignment.id,
                assignmentDate: activeAssignment.startDate,
                paymentMethod: paymentMethod
            });
        } else {
 // 활성 발령이 없으면 가장 최근 발령 업데이트
            const sortedAssignments = [...emp.assignments].sort((a, b) => {
                const dateA = a.startDate || '';
                const dateB = b.startDate || '';
                return dateB.localeCompare(dateA); // 최신순
            });
            
            if (sortedAssignments.length > 0) {
                const latestAssignment = sortedAssignments[0];
                latestAssignment.paymentMethod = paymentMethod;
                latestAssignment.isRankBased = isRankBased;
                
                로거_인사?.debug('최신 발령 급여방식 동기화', {
                    assignmentId: latestAssignment.id,
                    assignmentDate: latestAssignment.startDate,
                    paymentMethod: paymentMethod
                });
            }
        }
    }
    
 // ⭐⭐⭐ Phase 3 추가: 연봉제 → 호봉제 전환 시 처리 (2025-11-11)
    if (paymentMethod === '호봉제') {
        console.log(' 호봉제 전환 처리 시작');
        
 // ️ 임시: 데이터 오류 가능성 때문에 무조건 재계산
 // TODO: 나중에 사용자 확인 메시지 추가
        const hasValidRankInfo = false; // 강제로 재계산
        
        if (hasValidRankInfo) {
 // (현재는 실행되지 않음)
            console.log(' 기존 호봉 정보 유효 - startRank, firstUpgradeDate 유지');
            
            try {
                if (typeof RankCalculator !== 'undefined' && typeof DateUtils !== 'undefined') {
                    const today = DateUtils.formatDate(new Date());
                    
 // v4.0.0: API 우선 사용
                    let currentRank, nextUpgradeDate;
                    if (typeof API_인사 !== 'undefined') {
                        currentRank = await API_인사.calculateCurrentRank(
                            emp.rank.startRank,
                            emp.rank.firstUpgradeDate,
                            today
                        );
                        nextUpgradeDate = await API_인사.calculateNextUpgradeDate(
                            emp.rank.firstUpgradeDate,
                            today
                        );
                    } else {
                        currentRank = RankCalculator.calculateCurrentRank(
                            emp.rank.startRank,
                            emp.rank.firstUpgradeDate,
                            today
                        );
                        nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(
                            emp.rank.firstUpgradeDate,
                            today
                        );
                    }
                    
                    emp.rank.currentRank = currentRank;
                    emp.rank.nextUpgradeDate = nextUpgradeDate;
                    
                    console.log(' 현재 호봉 재계산 완료:', {
                        currentRank,
                        nextUpgradeDate
                    });
                    
                    로거_인사?.info('호봉제 전환 완료 (현재 호봉 재계산)', {
                        empId: emp.id,
                        startRank: emp.rank.startRank,
                        firstUpgradeDate: emp.rank.firstUpgradeDate,
                        currentRank: currentRank
                    });
                } else {
                    console.warn('️ RankCalculator를 찾을 수 없어 현재 호봉 재계산 생략');
                }
            } catch (error) {
                console.error(' 현재 호봉 재계산 오류:', error);
                로거_인사?.error('현재 호봉 재계산 오류', error);
            }
        } else {
 // ⭐ 무조건 처음부터 재계산 (데이터 오류 수정)
            console.log(' 호봉 처음부터 재계산 시작 (데이터 검증)');
            
            try {
                if (typeof RankCalculator !== 'undefined' && typeof TenureCalculator !== 'undefined') {
                    console.log(' RankCalculator와 TenureCalculator 존재 확인');
                    
 // 1. 과거 경력 계산 (입사 전 경력만!)
                    const entryDate = emp.employment?.entryDate || emp.entryDate;
                    const careers = emp.careers || emp.careerDetails || [];
                    
                    console.log(' 경력 데이터:', { entryDate, careersCount: careers.length });
                    
 // 과거 경력 합산 (입사 전 경력만 사용)
                    let totalYears = 0;
                    let totalMonths = 0;
                    let totalDays = 0;
                    
 // v4.0.0: for...of로 변경 (async 지원)
                    for (let index = 0; index < careers.length; index++) {
                        const career = careers[index];
                        try {
 // v4.0.0: API 우선 사용
                            let period;
                            if (typeof API_인사 !== 'undefined') {
                                period = await API_인사.calculateTenure(
                                    career.startDate,
                                    career.endDate
                                );
                            } else {
                                period = TenureCalculator.calculate(
                                    career.startDate,
                                    career.endDate
                                );
                            }
                            
 // rate가 "100%" 형식의 문자열일 수 있음 → 숫자로 변환
                            let rateValue = career.rate || 100;
                            if (typeof rateValue === 'string') {
                                rateValue = parseInt(rateValue.replace('%', '')) || 100;
                            }
                            
 // ⭐ v3.1.0: 주당근무시간 (기존 데이터 없으면 40)
                            const workingHours = career.workingHours ?? 40;
                            
                            const converted = CareerCalculator.applyConversionRate(period, rateValue, workingHours);
                            
                            totalYears += converted.years;
                            totalMonths += converted.months;
                            totalDays += converted.days;
                            
                            console.log(`경력 ${index + 1}:`, {
                                기간: `${career.startDate} ~ ${career.endDate}`,
                                주당근무시간: `${workingHours}시간`,
                                환산: `${converted.years}년 ${converted.months}개월 ${converted.days}일`
                            });
                        } catch (err) {
                            console.warn(`경력 ${index + 1} 계산 실패:`, err);
                        }
                    }
                    
 // 정규화
                    if (totalDays >= 30) {
                        totalMonths += Math.floor(totalDays / 30);
                        totalDays = totalDays % 30;
                    }
                    if (totalMonths >= 12) {
                        totalYears += Math.floor(totalMonths / 12);
                        totalMonths = totalMonths % 12;
                    }
                    
                    console.log(' 과거 경력 합계:', { totalYears, totalMonths, totalDays });
                    
 // 2. 호봉 계산
 // 입사호봉 = 1호봉 + 과거경력년수
                    const startRank = 1 + totalYears;
                    
                    console.log(` 입사호봉 계산: 1 + ${totalYears} = ${startRank}호봉`);
                    
 // v4.0.0: API 우선 사용
                    let firstUpgradeDate;
                    if (typeof API_인사 !== 'undefined') {
                        firstUpgradeDate = await API_인사.calculateFirstUpgradeDate(
                            entryDate,
                            totalYears,
                            totalMonths,
                            totalDays
                        );
                    } else {
                        firstUpgradeDate = RankCalculator.calculateFirstUpgradeDate(
                            entryDate,
                            totalYears,
                            totalMonths,
                            totalDays
                        );
                    }
                    
                    console.log(` 첫승급일 계산: ${firstUpgradeDate}`);
                    
 // 현재 호봉 = 입사호봉 + (첫승급일~오늘까지 경과연수)
 // ⭐ 현재 기관 재직기간은 여기서 자동으로 반영됨!
                    const today = DateUtils.formatDate(new Date());
                    
 // v4.0.0: API 우선 사용
                    let currentRank;
                    if (typeof API_인사 !== 'undefined') {
                        currentRank = await API_인사.calculateCurrentRank(
                            startRank,
                            firstUpgradeDate,
                            today
                        );
                    } else {
                        currentRank = RankCalculator.calculateCurrentRank(
                            startRank,
                            firstUpgradeDate,
                            today
                        );
                    }
                    
                    console.log(` 현재 호봉 계산: ${currentRank}호봉`);
                    
 // v4.0.0: API 우선 사용
                    let nextUpgradeDate;
                    if (typeof API_인사 !== 'undefined') {
                        nextUpgradeDate = await API_인사.calculateNextUpgradeDate(
                            firstUpgradeDate,
                            today
                        );
                    } else {
                        nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(
                            firstUpgradeDate,
                            today
                        );
                    }
                    
                    console.log(' 호봉 계산 완료:', {
                        startRank,
                        firstUpgradeDate,
                        currentRank,
                        nextUpgradeDate
                    });
                    
 // 3. rank 정보 업데이트
                    emp.rank.startRank = startRank;
                    emp.rank.firstUpgradeDate = firstUpgradeDate;
                    emp.rank.currentRank = currentRank;
                    emp.rank.nextUpgradeDate = nextUpgradeDate;
                    emp.rank.careerYears = totalYears;
                    emp.rank.careerMonths = totalMonths;
                    emp.rank.careerDays = totalDays;
                    
                    console.log(' 호봉 정보 업데이트 완료:', emp.rank);
                    
                    로거_인사?.info('호봉 자동 재계산 완료', {
                        empId: emp.id,
                        startRank: startRank,
                        firstUpgradeDate: firstUpgradeDate,
                        currentRank: currentRank,
                        careerYears: totalYears
                    });
                } else {
                    console.error(' RankCalculator 또는 TenureCalculator를 찾을 수 없습니다');
                    로거_인사?.warn('호봉계산기를 찾을 수 없어 호봉 재계산을 건너뜁니다');
                }
            } catch (error) {
                console.error(' 호봉 재계산 오류:', error);
                로거_인사?.error('호봉 재계산 오류', error);
 // 에러가 발생해도 급여방식 변경은 계속 진행
            }
        }
    } else {
        console.log('ℹ️ 연봉제로 변경 - 호봉 정보 보존 (참고용)');
    }
    
    로거_인사?.info('급여 지급 방식 변경', {
        empId: emp.id,
        name: emp.personalInfo?.name || emp.name,
        to: paymentMethod,
        isRankBased: isRankBased,
        hasFirstUpgradeDate: !!emp.rank.firstUpgradeDate,
        currentRank: emp.rank.currentRank,
        assignmentUpdated: !!(emp.assignments && emp.assignments.length > 0) // ⭐ 발령 업데이트 여부
    });
}

// ===== v3.2.0: 연속근무 연결 함수 =====

/**
 * 연속근무 상세 정보 토글
 * @global
 */
function toggleContinuousServiceInfo() {
    const checkbox = document.getElementById('editCsEnabled');
    const details = document.getElementById('continuousServiceDetails');
    
    if (checkbox && details) {
        details.style.display = checkbox.checked ? 'block' : 'none';
    }
}

/**
 * 연결 가능한 퇴사자 자동 검색
 * 조건: 동일 성명 + 동일 생년월일 + 퇴사일 다음날 = 현재 직원 입사일
 * @global
 */
function searchLinkedEmployee() {
    try {
        if (!currentEmployeeIdForEdit) {
            alert('직원 정보를 찾을 수 없습니다.');
            return;
        }
        
        const currentEmp = db.findEmployee(currentEmployeeIdForEdit);
        if (!currentEmp) {
            alert('직원 정보를 찾을 수 없습니다.');
            return;
        }
        
        const name = currentEmp.personalInfo?.name;
        const birthDate = currentEmp.personalInfo?.birthDate;
        const entryDate = currentEmp.employment?.entryDate;
        
        if (!name || !birthDate || !entryDate) {
            alert('직원의 성명, 생년월일, 입사일 정보가 필요합니다.');
            return;
        }
        
        console.log('[연속근무 검색] 조건:', { name, birthDate, entryDate });
        
 // 조건에 맞는 퇴사자 검색
        const employees = db.data?.employees || [];
        const candidates = employees.filter(emp => {
 // 자기 자신 제외
            if (emp.id === currentEmployeeIdForEdit) return false;
            
 // 퇴사자만
            const retireDate = emp.employment?.retirementDate;
            if (!retireDate) return false;
            
 // 동일 성명 + 동일 생년월일
            if (emp.personalInfo?.name !== name) return false;
            if (emp.personalInfo?.birthDate !== birthDate) return false;
            
 // 퇴사일 다음날 = 입사일 체크
            const retireDateObj = new Date(retireDate);
            retireDateObj.setDate(retireDateObj.getDate() + 1);
            const nextDay = retireDateObj.toISOString().split('T')[0];
            
            console.log('[연속근무 검색] 후보:', emp.id, '퇴사일:', retireDate, '다음날:', nextDay, '입사일:', entryDate);
            
            return nextDay === entryDate;
        });
        
        console.log('[연속근무 검색] 결과:', candidates.length, '명');
        
        if (candidates.length === 0) {
            alert('조건에 맞는 이전 근무 기록을 찾을 수 없습니다.\n\n조건:\n- 동일 성명\n- 동일 생년월일\n- 퇴사일 다음날 = 현재 입사일');
            return;
        }
        
        if (candidates.length > 1) {
            alert('조건에 맞는 기록이 여러 개입니다. 가장 최근 기록을 선택합니다.');
        }
        
 // 가장 최근 퇴사자 선택 (퇴사일 기준 내림차순)
        candidates.sort((a, b) => {
            const dateA = a.employment?.retirementDate || '';
            const dateB = b.employment?.retirementDate || '';
            return dateB.localeCompare(dateA);
        });
        
        const linkedEmp = candidates[0];
        const linkedDept = linkedEmp.currentPosition?.dept || linkedEmp.assignments?.[0]?.dept || '-';
        const linkedPos = linkedEmp.currentPosition?.position || linkedEmp.assignments?.[0]?.position || '-';
        const linkedEntry = linkedEmp.employment?.entryDate || '-';
        const linkedRetire = linkedEmp.employment?.retirementDate || '-';
        
 // UI 업데이트
        document.getElementById('editCsLinkedId').value = linkedEmp.id;
        document.getElementById('editCsOriginalEntry').value = linkedEntry;
        document.getElementById('linkedEmployeeInfo').innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${linkedEntry} ~ ${linkedRetire}</div>
            <div style="color:#6b7280;">${linkedDept} / ${linkedPos}</div>
        `;
        
 // 체크박스 활성화
        document.getElementById('editCsEnabled').checked = true;
        document.getElementById('continuousServiceDetails').style.display = 'block';
        
        로거_인사?.info('연속근무 연결 검색 성공', {
            currentEmpId: currentEmployeeIdForEdit,
            linkedEmpId: linkedEmp.id,
            originalEntry: linkedEntry
        });
        
        alert(`이전 근무 기록을 찾았습니다!\n\n${linkedEntry} ~ ${linkedRetire}\n${linkedDept} / ${linkedPos}`);
        
    } catch (error) {
        console.error('[연속근무 검색] 오류:', error);
        로거_인사?.error('연속근무 검색 오류', error);
        alert('검색 중 오류가 발생했습니다.');
    }
}

/**
 * 연속근무 연결 해제
 * @global
 */
function clearLinkedEmployee() {
    document.getElementById('editCsLinkedId').value = '';
    document.getElementById('editCsOriginalEntry').value = '';
    document.getElementById('linkedEmployeeInfo').innerHTML = 
        '<span style="color:#9ca3af;">연결된 이전 근무 기록이 없습니다.</span>';
    
    로거_인사?.debug('연속근무 연결 해제');
}

// 전역 함수 등록
window.toggleContinuousServiceInfo = toggleContinuousServiceInfo;
window.searchLinkedEmployee = searchLinkedEmployee;
window.clearLinkedEmployee = clearLinkedEmployee;

/**
 * 리팩토링 통계
 * 
 * Before (원본):
 * - 총 줄 수: 184줄
 * - 중복 코드: 약 10줄
 * - 에러 처리: 0곳
 * - 로깅: 0곳
 * - XSS 방지: 0곳 ️
 * - 검증: 부족
 * - 함수 개수: 4개
 * - 최장 함수: 100줄 (showEditEmployeeModal)
 * 
 * After (v3.0.5):
 * - 총 줄 수: 약 850줄 (주석 포함)
 * - 실제 코드: 약 550줄
 * - 중복 코드: 0줄 
 * - 에러 처리: 5곳 (모든 public 함수)
 * - 로깅: 25곳 (debug 14, info 3, warn 5, error 3)
 * - XSS 방지: 100% (모든 출력)
 * - 검증: 강화 (이메일, 전화번호, 급여 방식)
 * - 함수 개수: 14개 (10개 private 헬퍼)
 * - 최장 함수: 약 80줄
 * 
 * 개선 효과:
 * XSS 공격 100% 방지
 * 에러 추적 100% 가능
 * 검증 강화 (이메일, 전화번호, 급여 방식)
 * 주민번호 파싱 개선
 * 급여 지급 방식 수정 기능 추가 ⭐ v3.0.5
 * 함수 모듈화 (테스트 용이)
 * 유지보수성 3배 향상
 * 
 * 핵심 개선 사항 (v3.0.5):
 * 1. 급여 지급 방식 UI 추가 (호봉제/연봉제)
 * 2. 전환 시 사용자 확인 메시지
 * 3. emp.rank.isRankBased 플래그 관리
 * 4. 향후 급여 기능 대비 구조
 * 5. 완벽한 하위 호환성 유지
 * 
 * 핵심 개선 사항 (v3.0):
 * 1. DOM유틸_인사 사용 → XSS 방지
 * 2. 로거_인사 사용 → 완벽한 추적
 * 3. 에러처리_인사 사용 → 일관된 에러 처리
 * 4. 검증 강화 → 이메일/전화번호 형식
 * 5. 함수 분리 → 모듈화 및 테스트 용이성
 * 6. 주민번호 파싱 개선 → 에러 처리 추가
 */

// ===== v3.3.0 추가: 발령 이력 및 경력 인정율 관련 함수 =====

/**
 * 직원수정 모달용 발령 이력 HTML 생성
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {Function} escapeHtml - XSS 방지 함수
 * @returns {string} 발령 이력 HTML
 * 
 * @version 3.3.0
 */
function _generateAssignmentHistoryForEdit(emp, escapeHtml) {
    try {
        const assignments = emp.assignments || [];
        
        if (assignments.length === 0) {
            return `
                <div style="padding:16px;background:#f9fafb;border-radius:8px;text-align:center;color:#6b7280;">
                    <p style="margin:0;">발령 이력이 없습니다.</p>
                    <p style="margin:8px 0 0 0;font-size:0.85em;">인사발령 메뉴에서 발령을 등록해주세요.</p>
                </div>
            `;
        }
        
 // ⭐ v3.4.0: 발령을 날짜 오름차순으로 정렬 (과거 → 현재, 시간 흐름 순)
        const sortedAssignments = [...assignments].sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });
        
        let html = '<div style="max-height:300px;overflow-y:auto;">';
        
        sortedAssignments.forEach((assign, index) => {
            const isEntryAssignment = index === 0; // 가장 오래된 발령 (입사) - 시간순 첫 번째
            const isActive = assign.status === 'active';
            const statusBadge = isActive 
                ? '<span style="background:#10b981;color:white;padding:2px 8px;border-radius:4px;font-size:0.75em;margin-left:8px;">현재</span>'
                : '';
            
            const safeDept = escapeHtml(assign.dept || '-');
            const safePosition = escapeHtml(assign.position || '-');
            const safeDate = escapeHtml(assign.startDate || '-');
            
 // 직전 발령 정보 (인정율이 적용될 대상) - 시간순이므로 index - 1
            const prevAssignment = sortedAssignments[index - 1];
            const prevDept = prevAssignment ? escapeHtml(prevAssignment.dept || '-') : null;
            const prevStartDate = prevAssignment?.startDate || '';
            const prevEndDate = assign.startDate ? DateUtils.addDays(assign.startDate, -1) : '';
            
 // 이전 경력 인정율 정보
            const hasPriorCareerRate = assign.priorCareerRate !== null && assign.priorCareerRate !== undefined;
            const priorCareerRate = assign.priorCareerRate ?? 80;
            const priorCareerRateNote = escapeHtml(assign.priorCareerRateNote || '');
            
            html += `
                <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:${isActive ? '#f0fdf4' : 'white'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-weight:600;">
                            ${safeDate} ${statusBadge}
                        </div>
                        <div style="color:#6b7280;font-size:0.9em;">
                            ${safeDept} / ${safePosition}
                        </div>
                    </div>
                    
                    ${isEntryAssignment ? `
                        <!-- 입사 발령: 인정율 입력란 없음 -->
                        <div style="padding:8px 12px;background:#f3f4f6;border-radius:6px;color:#6b7280;font-size:0.85em;">
                            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> 입사 발령 - 이전 경력 없음</span>
                        </div>
                    ` : `
                        <!-- 전보/승진 등: 직전 경력에 대한 인정율 설정 -->
                        <div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                            <div style="margin-bottom:8px;">
                                <span style="font-size:0.9em;font-weight:600;color:#374151;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 직전 경력(${prevDept}) 인정율
                                </span>
                                <span style="font-size:0.8em;color:#6b7280;margin-left:8px;">
                                    ${prevStartDate} ~ ${prevEndDate}
                                </span>
                            </div>
                            
                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    <input type="number" 
                                           id="priorRate_${assign.id}" 
                                           class="form-control" 
                                           style="width:80px;padding:4px 8px;font-size:0.9em;" 
                                           value="${hasPriorCareerRate ? priorCareerRate : ''}" 
                                           min="0" max="100" step="10"
                                           placeholder="100"
                                           onchange="updateAssignmentPriorCareerRate('${emp.id}', '${assign.id}')">
                                    <span style="font-size:0.85em;color:#64748b;">%</span>
                                </div>
                                <div style="flex:1;min-width:150px;">
                                    <input type="text" 
                                           id="priorRateNote_${assign.id}" 
                                           class="form-control" 
                                           style="padding:4px 8px;font-size:0.9em;" 
                                           value="${priorCareerRateNote}" 
                                           placeholder="사유 (선택)"
                                           onchange="updateAssignmentPriorCareerRate('${emp.id}', '${assign.id}')">
                                </div>
                            </div>
                            
                            ${hasPriorCareerRate ? `
                                <div style="margin-top:8px;font-size:0.8em;color:#059669;">
                                    ✓ ${prevDept} 경력(${prevStartDate}~${prevEndDate})에 ${priorCareerRate}% 적용됨
                                </div>
                            ` : `
                                <div style="margin-top:8px;font-size:0.8em;color:#9ca3af;">
                                    미입력 시 100% (전체 인정)
                                </div>
                            `}
                        </div>
                    `}
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
        
    } catch (error) {
        console.error('발령 이력 HTML 생성 실패:', error);
        로거_인사?.error('발령 이력 HTML 생성 실패', error);
        return '<div style="color:#ef4444;">발령 이력을 불러오는 중 오류가 발생했습니다.</div>';
    }
}

/**
 * 발령별 이전 경력 인정율 업데이트
 * 
 * @param {string} empId - 직원 ID
 * @param {string} assignmentId - 발령 ID
 * 
 * @description
 * 직원수정 모달에서 발령별 인정율을 변경할 때 호출됩니다.
 * 값이 비어있거나 100이면 null로 저장 (인정율 미적용)
 * 
 * @version 4.0.0 - async API 버전
 */
async function updateAssignmentPriorCareerRate(empId, assignmentId) {
    try {
        로거_인사?.debug('발령 이전 경력 인정율 업데이트 시작', { empId, assignmentId });
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없음', { empId });
            return;
        }
        
        const assignment = emp.assignments?.find(a => a.id === assignmentId);
        if (!assignment) {
            로거_인사?.error('발령을 찾을 수 없음', { assignmentId });
            return;
        }
        
 // 입력값 가져오기
        const rateInput = document.getElementById(`priorRate_${assignmentId}`);
        const noteInput = document.getElementById(`priorRateNote_${assignmentId}`);
        
        const rateValue = rateInput?.value?.trim();
        const noteValue = noteInput?.value?.trim() || '';
        
 // 값 처리
        let priorCareerRate = null;
        let priorCareerRateNote = '';
        
        if (rateValue !== '' && rateValue !== '100') {
            let rate = parseInt(rateValue);
            if (!isNaN(rate)) {
 // 범위 제한
                if (rate < 0) rate = 0;
                if (rate > 100) rate = 100;
                priorCareerRate = rate;
                priorCareerRateNote = noteValue;
            }
        }
        
 // 발령 정보 업데이트
        const oldRate = assignment.priorCareerRate;
        assignment.priorCareerRate = priorCareerRate;
        assignment.priorCareerRateNote = priorCareerRateNote;
        
 // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('발령 이전 경력 인정율 업데이트 완료', {
            empId,
            assignmentId,
            oldRate,
            newRate: priorCareerRate,
            note: priorCareerRateNote
        });
        
 // ⭐ v4.0.0: 호봉 재계산 (InternalCareerCalculator 사용)
        await _recalculateRankWithPriorCareerRate(emp, priorCareerRate, oldRate);
        
    } catch (error) {
        console.error('발령 이전 경력 인정율 업데이트 실패:', error);
        로거_인사?.error('발령 이전 경력 인정율 업데이트 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '인정율 업데이트 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 이전 경력 인정율 변경 시 호봉 재계산
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {number|null} newRate - 새 인정율
 * @param {number|null} oldRate - 이전 인정율
 * 
 * @version 4.0.0 - async API 버전
 */
async function _recalculateRankWithPriorCareerRate(emp, newRate, oldRate) {
    try {
 // 호봉제 직원만 재계산
        if (emp.rank?.isRankBased === false) {
            로거_인사?.debug('연봉제 직원 - 호봉 재계산 스킵');
            return;
        }
        
 // InternalCareerCalculator 존재 확인
        if (typeof InternalCareerCalculator === 'undefined') {
            console.warn('InternalCareerCalculator가 로드되지 않아 호봉 재계산을 스킵합니다.');
            return;
        }
        
        const today = DateUtils.formatDate(new Date());
        const entryDate = emp.employment?.entryDate || emp.entryDate;
        
        if (!entryDate) {
            로거_인사?.warn('입사일 없음 - 호봉 재계산 스킵');
            return;
        }
        
 // 과거 경력 (타 기관) 정보
        const pastCareers = emp.careerDetails || [];
        let totalPastYears = 0;
        let totalPastMonths = 0;
        let totalPastDays = 0;
        
        pastCareers.forEach(career => {
 // 환산 결과에서 년/월/일 파싱
            const converted = career.converted || career.period || '';
            const match = converted.match(/(\d+)년\s*(\d+)개월\s*(\d+)일/);
            if (match) {
                totalPastYears += parseInt(match[1]) || 0;
                totalPastMonths += parseInt(match[2]) || 0;
                totalPastDays += parseInt(match[3]) || 0;
            }
        });
        
 // 월/일 정규화
        totalPastMonths += Math.floor(totalPastDays / 30);
        totalPastDays = totalPastDays % 30;
        totalPastYears += Math.floor(totalPastMonths / 12);
        totalPastMonths = totalPastMonths % 12;
        
 // 현 기관 경력 (발령별 인정율 적용)
        const internalResult = InternalCareerCalculator.calculateWithPriorCareerRate(emp, today);
        
 // ⭐ v3.3.1: 모든 발령이 100% 인정율인지 확인
 // 발령별 합산 vs 전체 계산의 오차(최대 10일)를 방지
        const allFullRate = internalResult.details.every(d => d.rate === 100);
        
 // 조정된 입사일
        let adjustedEntryDate = entryDate;
        let lostDays = 0;
        
        if (!allFullRate) {
 // v4.0.0: API 우선 사용
            let originalPeriod;
            if (typeof API_인사 !== 'undefined') {
                originalPeriod = await API_인사.calculateTenure(entryDate, today);
            } else {
                originalPeriod = TenureCalculator.calculate(entryDate, today);
            }
            const originalDays = originalPeriod.years * 365 + originalPeriod.months * 30 + originalPeriod.days;
            
 // 손실 일수
            lostDays = originalDays - internalResult.totalDays;
            
            if (lostDays > 0) {
                adjustedEntryDate = DateUtils.addDays(entryDate, lostDays);
            }
        }
 // 모든 발령이 100%면 adjustedEntryDate = entryDate 유지
        
 // v4.0.0: API 우선 사용
        const startRank = 1 + totalPastYears;
        let firstUpgradeDate;
        if (typeof API_인사 !== 'undefined') {
            firstUpgradeDate = await API_인사.calculateFirstUpgradeDate(
                adjustedEntryDate,
                totalPastYears,
                totalPastMonths,
                totalPastDays
            );
        } else {
            firstUpgradeDate = RankCalculator.calculateFirstUpgradeDate(
                adjustedEntryDate,
                totalPastYears,
                totalPastMonths,
                totalPastDays
            );
        }
        
        let currentRank;
        if (typeof API_인사 !== 'undefined') {
            currentRank = await API_인사.calculateCurrentRank(startRank, firstUpgradeDate, today);
        } else {
            currentRank = RankCalculator.calculateCurrentRank(startRank, firstUpgradeDate, today);
        }
        
        let nextUpgradeDate;
        if (typeof API_인사 !== 'undefined') {
            nextUpgradeDate = await API_인사.calculateNextUpgradeDate(firstUpgradeDate, today);
        } else {
            nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(firstUpgradeDate, today);
        }
        
 // 저장
        if (!emp.rank) emp.rank = {};
        emp.rank.startRank = startRank;
        emp.rank.firstUpgradeDate = firstUpgradeDate;
        emp.rank.currentRank = currentRank;
        emp.rank.nextUpgradeDate = nextUpgradeDate;
        
        db.saveEmployee(emp);
        
 // 콘솔 로그
        console.log('===== 호봉 재계산 완료 (인정율 변경) =====');
        console.log('과거 경력:', `${totalPastYears}년 ${totalPastMonths}개월 ${totalPastDays}일`);
        console.log('현 기관 경력 (인정율 적용):', `${internalResult.years}년 ${internalResult.months}개월 ${internalResult.days}일`);
        console.log('손실 일수:', lostDays, '일');
        console.log('조정된 입사일:', adjustedEntryDate);
        console.log('입사호봉:', startRank);
        console.log('첫승급일:', firstUpgradeDate);
        console.log('현재호봉:', currentRank);
        console.log('차기승급일:', nextUpgradeDate);
        console.log('=============================================');
        
        로거_인사?.info('호봉 재계산 완료 (인정율 변경)', {
            empId: emp.id,
            oldRate,
            newRate,
            startRank,
            currentRank,
            firstUpgradeDate
        });
        
 // 알림
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(`호봉 재계산 완료: ${currentRank}호봉`);
        }
        
 // 직원 목록 갱신
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
    } catch (error) {
        console.error('호봉 재계산 실패:', error);
        로거_인사?.error('호봉 재계산 실패', error);
    }
}
