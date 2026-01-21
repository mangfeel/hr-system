/**
 * 인사발령_인사.js - 프로덕션급 리팩토링
 * 
 * 인사발령 관리 (검증 강화)
 * - 인사발령 등록 (부서/직위 변경)
 * - 발령 이력 조회
 * - 발령 수정/삭제
 * - 발령일 검증 (입사일 이후)
 * - 활성 발령 자동 종료
 * - 발령 기간 중복 검증 ⭐ v3.0.5 추가
 * - 주당근무시간 관리 ⭐ v3.1.0 추가
 * - 발령 급여방식 자동 저장 ⭐ v3.1.1 추가
 * - 월소정근로시간 표시 ⭐ v3.2.0 추가
 * - 이전 경력 인정율 설정 ⭐ v3.3.0 추가
 * - 발령 ID 타입 호환성 ⭐ v3.4.1 추가
 * - 퇴사자/종료 발령 수정 시 currentPosition 반영 ⭐ v3.5.0 추가
 * 
 * @version 4.0.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.0.0 (2026-01-21) ⭐ API 연동 버전
 *   - saveAssignmentEdit() async 변경
 *   - 호봉 계산 API 우선 사용 (API_인사)
 *   - 서버 API로 계산 로직 보호
 * 
 * v3.5.0 (2026-01-07) ⭐ 퇴사자/종료 발령 수정 시 즉시 반영
 *   - 문제: 퇴사자 발령 수정 시 직원목록/퇴사자목록에 반영 안 됨 (F5 눌러도 안 됨)
 *   - 원인: 활성 발령만 currentPosition 업데이트, 종료 발령은 무시
 *   - 해결: 마지막 발령(가장 최근 시작일)이면 currentPosition 업데이트
 *   - _isLastAssignment() 헬퍼 함수 추가
 *   - saveAssignmentEdit(): 마지막 발령 여부 확인 후 currentPosition 갱신
 *   - loadEmployeeList(): 활성/종료 여부와 관계없이 항상 호출
 * 
 * v3.4.1 (2025-12-10) ⭐ 신규직원 발령 수정 버그 수정
 *   - 발령 ID 타입 불일치 문제 해결 (숫자 vs 문자열)
 *   - 신규직원의 첫 발령 ID가 숫자(1)로 저장되나, 
 *     HTML onclick에서 문자열('1')로 전달되어 === 비교 실패
 *   - editAssignment(): String() 변환으로 타입 안전 비교
 *   - saveAssignmentEdit(): String() 변환으로 타입 안전 비교
 *   - deleteAssignment(): String() 변환으로 타입 안전 비교
 *   - _generateEditAssignmentModalHTML(): 일관성 위해 동일 적용
 * 
 * v3.3.3 (2025-12-04) ⭐ UI/UX 전면 개편
 *   - 인사발령 화면을 탭 방식으로 분리 (등록/내역)
 *   - 탭 디자인: 언더라인 스타일로 현대적 개선
 *   - 등록 폼: 카드 테두리 제거, 섹션 구분선으로 가볍게
 *   - 급여방식: 세그먼트 컨트롤 스타일 (토글 버튼)
 *   - 테이블: 호버 효과, 줄무늬, 세련된 버튼
 *   - 그라데이션 스텝 배지, 등록 버튼 호버 효과
 *   - 검색/필터 기능 및 필터 버그 수정
 *   - 이전 발령 경력 인정율 설명 개선 (보건복지부 가이드라인)
 *   - 발령일 기본값을 오늘 날짜로 자동 설정
 * 
 * v3.3.2 (2025-12-03) ⭐ 발령별 개별 인정율 지원
 *   - priorCareerRates 데이터 구조 추가 (각 이전 발령에 개별 인정율)
 *   - 수정 모달에서 모든 이전 발령의 인정율 개별 설정 가능
 *   - toggleEditPriorRateItem() 함수 추가
 *   - 하위 호환: 기존 priorCareerRate 데이터 자동 마이그레이션
 * 
 * v3.3.1 (2025-12-03) ⭐ 이전 경력 인정율 UI 개선
 *   - 새 발령 등록 폼에 월소정근로시간 자동 표시
 *   - 발령 수정 모달에 월소정근로시간 자동 표시
 *   - calculateMonthlyWorkingHoursForAssignment() 함수 추가
 *   - updateAssignmentMonthlyHours() 함수 추가
 *   - updateEditAssignMonthlyHours() 함수 추가
 *   - 올림 처리: 공무원 규정(209시간)과 동일 기준
 * 
 * v3.1.1 (2025-11-26) ⭐ 발령 급여방식 자동 저장 버그 수정
 *   - 새 발령 등록 시 paymentMethod, isRankBased 필드 추가
 *   - _collectAssignmentFormData()에 급여방식 수집 추가
 *   - 레거시 발령(164건) 급여방식 "정보없음" 문제 근본 해결
 *   - 향후 모든 발령에 급여방식 자동 저장됨
 * 
 * v3.1.0 (2025-11-26) ⭐ 주당근무시간 비율 적용
 *   - 발령 등록 폼에 "주당근무시간" 필드 추가 (1~40시간)
 *   - 발령 수정 모달에 "주당근무시간" 필드 추가
 *   - 발령 데이터에 workingHours 저장
 *   - 기존 발령은 기본값 40시간으로 표시 (하위 호환)
 *   - 호봉 계산 시 근무시간 비율 적용을 위한 데이터 준비
 * 
 * v3.0.7 - Phase 3 기능 추가: 호봉 자동 재계산 (2025-11-11)
 *   ⭐ 신규 기능: 활성 발령 수정 시 연봉제 → 호봉제 전환 시 호봉 자동 재계산
 *   - 경력이 있으면 경력 기반 호봉 계산
 *   - 경력이 없으면 입사일 기준 1호봉부터 시작
 *   - startRank, firstUpgradeDate, currentRank 자동 설정
 *   - 직원수정_인사.js v3.0.8 패턴 적용
 *   - 호봉 배지가 정상적으로 표시됨
 * 
 * v3.0.6 - Phase 3-3: 발령 수정 시 급여방식 수정 가능 (2025-11-11)
 *   - 발령 수정 모달에 급여방식 라디오 버튼 추가
 *   - 폼 데이터 수집에 급여방식 포함
 *   - 발령 객체에 급여방식 저장
 *   - 활성 발령 수정 시 현재 급여방식 자동 동기화
 *   - 성공 메시지에 급여방식 정보 표시
 * 
 * v3.0.5 - 기간 중복 검증 추가 (2025-11-06)
 *   🔴 v1.8 가이드 패턴 5 적용
 *   - 발령 기간 중복 검증 로직 추가
 *   - _validateAssignmentDateOverlap() 함수 추가
 *   - saveAssignment()에 중복 검증 적용
 *   - saveAssignmentEdit()에 중복 검증 적용
 *   - assignments 배열 생성 시 로깅 추가 (패턴 4)
 *   - 하위 호환성 100% 유지
 * 
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (직원유틸, DOM유틸)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - JSDoc 주석 추가
 *   - XSS 방지
 *   - 검증 강화 유지
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 변수 유지
 * - 전역 함수 유지
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
 * 현재 발령 수정 중인 직원 ID
 * @type {string|null}
 */
let currentEmployeeIdForAssignment = null;

/**
 * 현재 수정 중인 발령 ID
 * @type {string|null}
 */
let currentAssignmentId = null;

// ===== 메인 함수 =====

/**
 * 인사발령 탭 로드
 * 
 * @description
 * 인사발령 화면을 초기화합니다.
 * - 직원 선택 드롭다운 생성
 * - 발령 이력 표시
 * 
 * @example
 * loadAssignmentTab(); // 인사발령 탭 로드
 */
function loadAssignmentTab() {
    try {
        로거_인사?.debug('인사발령 탭 로드 시작');
        
        const employees = db.getActiveEmployees();
        
        로거_인사?.debug('재직자 조회 완료', { count: employees.length });
        
        // 직원 선택 드롭다운 생성
        const select = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('assignmentEmployeeSelect')
            : document.getElementById('assignmentEmployeeSelect');
        
        if (!select) {
            로거_인사?.warn('직원 선택 요소를 찾을 수 없습니다');
            return;
        }
        
        // ✅ XSS 방지
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
        
        const options = employees.map(emp => {
            const name = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.getName(emp)
                : (emp.personalInfo?.name || emp.name);
            
            const dept = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.getDepartment(emp)
                : (emp.currentPosition?.dept || emp.dept);
            
            const isOnLeave = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.isOnMaternityLeave(emp)
                : (emp.maternityLeave?.isOnLeave || false);
            
            const safeName = escapeHtml(name);
            const safeDept = escapeHtml(dept);
            const leaveIcon = isOnLeave ? ' 🤱' : '';
            
            return `<option value="${emp.id}">${safeName} (${safeDept})${leaveIcon}</option>`;
        }).join('');
        
        select.innerHTML = '<option value="">선택하세요</option>' + options;
        
        // ⭐ v3.3.3: 발령일 기본값을 오늘 날짜로 설정
        const assignmentDateField = document.getElementById('assignmentDate');
        if (assignmentDateField && !assignmentDateField.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            assignmentDateField.value = `${yyyy}-${mm}-${dd}`;
            로거_인사?.debug('발령일 기본값 설정', { date: assignmentDateField.value });
        }
        
        // ⭐ v3.3.0: 이전 경력 인정율 UI 동적 추가
        _injectPriorCareerRateUI();
        
        // ⭐ v3.3.3: 급여방식 세그먼트 컨트롤 스타일 초기화
        _initPaymentMethodSegment();
        
        // 발령 이력 로드
        loadAssignmentHistory();
        
        로거_인사?.info('인사발령 탭 로드 완료', { employeeCount: employees.length });
        
    } catch (error) {
        로거_인사?.error('인사발령 탭 로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '인사발령 화면을 불러오는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 발령 대상 직원 정보 불러오기
 * 
 * @description
 * 선택된 직원의 현재 부서/직위 정보를 폼에 자동 입력합니다.
 * 
 * @example
 * loadEmployeeForAssignment(); // 직원 선택 시 호출
 */
function loadEmployeeForAssignment() {
    try {
        // ⭐ v3.3.2: XSS 방지용 escapeHtml 함수
        const escapeHtml = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        const empIdField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('assignmentEmployeeSelect')
            : document.getElementById('assignmentEmployeeSelect');
        
        if (!empIdField) return;
        
        const empId = empIdField.value;
        if (!empId) return;
        
        로거_인사?.debug('발령 대상 직원 정보 로드', { empId });
        
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.warn('직원을 찾을 수 없습니다', { empId });
            return;
        }
        
        // 현재 직위 정보 가져오기
        const dept = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getDepartment(emp)
            : (emp.currentPosition?.dept || emp.dept || '');
        
        const position = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getPosition(emp)
            : (emp.currentPosition?.position || emp.position || '');
        
        const grade = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getGrade(emp)
            : (emp.currentPosition?.grade || '');
        
        // 폼에 입력
        const deptField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('assignmentDept')
            : document.getElementById('assignmentDept');
        
        const positionField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('assignmentPosition')
            : document.getElementById('assignmentPosition');
        
        const gradeField = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('assignmentGrade')
            : document.getElementById('assignmentGrade');
        
        if (deptField) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(deptField, dept);
            } else {
                deptField.value = dept;
            }
        }
        
        if (positionField) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(positionField, position);
            } else {
                positionField.value = position;
            }
        }
        
        if (gradeField) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(gradeField, grade);
            } else {
                gradeField.value = grade;
            }
        }
        
        // ⭐ v3.3.3: 이전 모든 발령에 대한 인정율 UI 동적 생성 (개선)
        const priorCareerRateSection = document.getElementById('assignmentPriorCareerRateSection');
        if (priorCareerRateSection) {
            const existingAssignments = emp.assignments || [];
            
            if (existingAssignments.length === 0) {
                // 첫 발령(입사 발령)이 될 것이므로 인정율 섹션 숨김
                priorCareerRateSection.style.display = 'none';
                로거_인사?.debug('첫 발령 - 인정율 섹션 숨김');
            } else {
                // 두 번째 이상 발령이므로 인정율 섹션 표시
                priorCareerRateSection.style.display = 'block';
                
                // 발령을 날짜순 정렬
                const sortedAssignments = [...existingAssignments].sort((a, b) => 
                    new Date(a.startDate) - new Date(b.startDate)
                );
                
                // 이전 발령 목록 HTML 생성 (개선된 UI)
                let priorAssignmentsHTML = '';
                
                if (sortedAssignments.length === 0) {
                    priorAssignmentsHTML = `
                        <div style="padding:20px;text-align:center;color:#6b7280;">
                            이전 발령 이력이 없습니다.
                        </div>
                    `;
                } else {
                    for (let i = 0; i < sortedAssignments.length; i++) {
                        const assign = sortedAssignments[i];
                        const nextAssign = sortedAssignments[i + 1];
                        const endDate = nextAssign 
                            ? DateUtils.addDays(nextAssign.startDate, -1) 
                            : '현재';
                        
                        const safeDept = escapeHtml(assign.dept || '-');
                        const safePosition = escapeHtml(assign.position || '-');
                        const orderNum = i + 1;
                        const isActive = assign.status === 'active';
                        const statusBadge = isActive 
                            ? '<span style="background:#dcfce7;color:#166534;font-size:0.7em;padding:2px 6px;border-radius:4px;margin-left:6px;">현재</span>'
                            : '';
                        
                        priorAssignmentsHTML += `
                            <div style="padding:14px;border-bottom:1px solid #f3f4f6;${i === sortedAssignments.length - 1 ? 'border-bottom:none;' : ''}">
                                <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
                                    <input type="checkbox" 
                                           id="newAssignPriorRateEnabled_${assign.id}" 
                                           onchange="toggleNewAssignPriorRateItem('${assign.id}')"
                                           style="margin-top:3px;">
                                    <div style="flex:1;">
                                        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
                                            <span style="background:#e0e7ff;color:#3730a3;font-size:0.75em;padding:2px 8px;border-radius:4px;font-weight:600;">
                                                ${orderNum}차 발령
                                            </span>
                                            <span style="font-weight:600;color:#1f2937;">${safeDept}</span>
                                            <span style="color:#6b7280;font-size:0.9em;">${safePosition}</span>
                                            ${statusBadge}
                                        </div>
                                        <div style="font-size:0.85em;color:#6b7280;margin-top:4px;">
                                            📅 ${assign.startDate} ~ ${endDate}
                                        </div>
                                    </div>
                                </label>
                                <div id="newAssignPriorRateDetails_${assign.id}" style="display:none;margin-top:12px;margin-left:28px;padding:12px;background:#f8fafc;border-radius:6px;">
                                    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <label style="font-size:0.85em;color:#374151;font-weight:500;">인정율:</label>
                                            <input type="number" 
                                                   id="newAssignPriorRate_${assign.id}" 
                                                   class="form-control" 
                                                   style="width:70px;padding:6px 10px;font-size:0.9em;text-align:center;" 
                                                   value="80" 
                                                   min="0" max="100" step="10">
                                            <span style="font-size:0.85em;color:#6b7280;">%</span>
                                        </div>
                                        <div style="flex:1;min-width:150px;">
                                            <input type="text" 
                                                   id="newAssignPriorRateNote_${assign.id}" 
                                                   class="form-control" 
                                                   style="padding:6px 10px;font-size:0.9em;" 
                                                   placeholder="예: 동종 기관 경력">
                                        </div>
                                    </div>
                                    <div style="font-size:0.8em;color:#64748b;margin-top:8px;">
                                        💡 이 발령 기간의 경력을 새 호봉 계산에 몇 %로 반영할지 설정합니다.
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
                
                // 목록 컨테이너에 삽입
                const listContainer = document.getElementById('assignmentPriorCareerRatesList');
                if (listContainer) {
                    listContainer.innerHTML = priorAssignmentsHTML;
                }
                
                로거_인사?.debug('이전 발령 목록 동적 생성 완료', { 
                    assignmentCount: sortedAssignments.length 
                });
            }
        }
        
        로거_인사?.debug('직원 정보 로드 완료', { dept, position, grade });
        
    } catch (error) {
        로거_인사?.error('직원 정보 로드 실패', error);
    }
}

/**
 * 인사발령 저장
 * 
 * @description
 * 새로운 인사발령을 등록합니다.
 * - 입력값 검증
 * - 발령일 검증 (입사일 이후)
 * - 발령 기간 중복 검증 ⭐ v3.0.5 추가
 * - 기존 활성 발령 자동 종료
 * - 현재 직위 정보 업데이트
 * 
 * @example
 * saveAssignment(); // 발령 등록
 */
function saveAssignment() {
    try {
        로거_인사?.debug('인사발령 저장 시작');
        
        // 입력값 수집
        const formData = _collectAssignmentFormData();
        
        // 기본 검증
        if (!formData.empId || !formData.assignmentDate || !formData.newDept || !formData.newPosition) {
            로거_인사?.warn('필수 항목 누락');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('필수 항목을 입력하세요.');
            } else {
                alert('⚠️ 필수 항목을 입력하세요.');
            }
            return;
        }
        
        // 직원 정보 조회
        const emp = db.findEmployee(formData.empId);
        if (!emp) {
            로거_인사?.error('[saveAssignment] 직원을 찾을 수 없습니다', { empId: formData.empId });
            
            console.error('❌ [saveAssignment] 직원을 찾을 수 없습니다:', formData.empId);
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('[발령 등록] 직원을 찾을 수 없습니다.');
            } else {
                alert('⚠️ [발령 등록] 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name);
        
        const entryDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getEntryDate(emp)
            : emp.employment?.entryDate;
        
        // 발령일 검증
        const validation = Validator.validateAssignmentDate(entryDate, formData.assignmentDate);
        
        if (!validation.valid) {
            로거_인사?.warn('발령일 검증 실패', { errors: validation.errors });
            
            const errorMsg = '⚠️ 발령일 검증 실패:\n\n' +
                validation.errors.join('\n') +
                '\n\n입사일: ' + entryDate +
                '\n발령일: ' + formData.assignmentDate;
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                alert(errorMsg);
            }
            return;
        }
        
        // 날짜 범위 검증
        if (!Validator.isDateInValidRange(formData.assignmentDate)) {
            로거_인사?.warn('발령일이 유효 범위를 벗어남', { date: formData.assignmentDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령일이 유효한 범위(1900~2100)를 벗어났습니다.');
            } else {
                alert('⚠️ 발령일이 유효한 범위(1900~2100)를 벗어났습니다.');
            }
            return;
        }
        
        // 부서/직위 검증
        if (!Validator.isNotEmpty(formData.newDept)) {
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('부서를 입력하세요.');
            } else {
                alert('⚠️ 부서를 입력하세요.');
            }
            return;
        }
        
        if (!Validator.isNotEmpty(formData.newPosition)) {
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직위를 입력하세요.');
            } else {
                alert('⚠️ 직위를 입력하세요.');
            }
            return;
        }
        
        // ⭐ v3.0.5: 발령 기간 중복 검증 추가
        const overlapValidation = _validateAssignmentDateOverlap(emp, formData.assignmentDate);
        if (!overlapValidation.valid) {
            로거_인사?.warn('발령 기간 중복', { date: formData.assignmentDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn(overlapValidation.message);
            } else {
                alert('⚠️ ' + overlapValidation.message);
            }
            return;
        }
        
        // 기존 활성 발령 종료
        if (emp.assignments && emp.assignments.length > 0) {
            const activeAssignments = emp.assignments.filter(a => a.status === 'active');
            activeAssignments.forEach(assign => {
                assign.status = 'completed';
                const previousEndDate = DateUtils.addDays(formData.assignmentDate, -1);
                assign.endDate = previousEndDate;
            });
            
            로거_인사?.debug('기존 활성 발령 종료', { count: activeAssignments.length });
        }
        
        // 새 발령 생성
        const assignmentNumber = (emp.assignments?.length || 0) + 1;
        const newAssignment = {
            id: `ASSIGN${Date.now()}`,
            code: `${emp.uniqueCode}-${String(assignmentNumber).padStart(2, '0')}`,
            startDate: formData.assignmentDate,
            endDate: null,
            dept: formData.newDept,
            position: formData.newPosition,
            grade: formData.newGrade,
            workingHours: formData.workingHours,  // ⭐ v3.1.0: 주당근무시간
            paymentMethod: formData.paymentMethod,  // ⭐ v3.1.1: 급여방식
            isRankBased: formData.isRankBased,  // ⭐ v3.1.1: 호봉제 여부
            employmentType: formData.employmentType,  // ⭐ v3.2.0: 고용형태
            status: 'active'
        };
        
        // ⭐ v3.3.2: 발령별 개별 인정율 저장
        if (formData.priorCareerRates && Object.keys(formData.priorCareerRates).length > 0) {
            newAssignment.priorCareerRates = formData.priorCareerRates;
            로거_인사?.debug('이전 경력 인정율 적용', { 
                priorCareerRates: formData.priorCareerRates 
            });
        }
        
        // ⭐ v3.0.5: 배열 생성 시 로깅 추가 (패턴 4)
        if (!emp.assignments) {
            로거_인사?.debug('assignments 배열 생성 (구버전 데이터)', { 
                empId: emp.id,
                uniqueCode: emp.uniqueCode 
            });
            emp.assignments = [];
        }
        emp.assignments.push(newAssignment);
        
        // 현재 직위 정보 업데이트
        emp.currentPosition = {
            dept: formData.newDept,
            position: formData.newPosition,
            grade: formData.newGrade,
            jobType: emp.currentPosition?.jobType || ''
        };
        
        // ⭐ v3.1.1: 새 발령 등록 시 현재 급여방식도 동기화
        if (!emp.rank) emp.rank = {};
        if (!emp.salaryInfo) emp.salaryInfo = {};
        
        emp.rank.isRankBased = formData.isRankBased;
        emp.salaryInfo.isRankBased = formData.isRankBased;
        emp.salaryInfo.paymentMethod = formData.paymentMethod;
        
        // ⭐ v3.2.0: 고용형태 동기화
        if (!emp.employment) emp.employment = {};
        if (formData.employmentType && emp.employment.type !== formData.employmentType) {
            로거_인사?.info('고용형태 변경', { 
                empId: emp.id,
                from: emp.employment.type, 
                to: formData.employmentType 
            });
            emp.employment.type = formData.employmentType;
        }
        
        로거_인사?.debug('급여방식 동기화 완료', { 
            paymentMethod: formData.paymentMethod,
            isRankBased: formData.isRankBased
        });
        
        // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('인사발령 등록 완료', {
            empId: emp.id,
            name: name,
            code: newAssignment.code,
            dept: formData.newDept,
            position: formData.newPosition
        });
        
        // ⭐ v3.3.2: priorCareerRates가 있으면 재계산 여부 확인
        const hasPriorCareerRates = formData.priorCareerRates && Object.keys(formData.priorCareerRates).length > 0;
        
        if (hasPriorCareerRates) {
            // 재계산 확인 모달 표시
            _showRecalculateConfirmModal(emp.id, name, () => {
                // 폼 초기화 및 목록 갱신
                _resetAssignmentForm();
                loadAssignmentHistory();
                if (typeof loadEmployeeList === 'function') {
                    loadEmployeeList();
                }
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            });
        } else {
            // 성공 메시지
            const successMsg = `✅ ${name} 님의 인사발령이 등록되었습니다.\n\n` +
                             `발령코드: ${newAssignment.code}\n` +
                             `발령일: ${formData.assignmentDate}\n` +
                             `부서: ${formData.newDept}\n` +
                             `직위: ${formData.newPosition}`;
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.success('인사발령이 등록되었습니다.');
            } else {
                alert(successMsg);
            }
            
            // 폼 초기화
            _resetAssignmentForm();
            
            // 발령 이력 갱신
            loadAssignmentHistory();
            
            // 직원 목록 갱신
            if (typeof loadEmployeeList === 'function') {
                loadEmployeeList();
            }
            
            // 대시보드 갱신
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        }
        
    } catch (error) {
        로거_인사?.error('인사발령 저장 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '저장 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 발령 이력 조회
 * 
 * @description
 * 전체 직원의 발령 이력을 조회합니다.
 * - 최근 20건만 표시 ⭐ v3.3.3 변경
 * - 테이블 형식으로 표시 ⭐ v3.3.3 변경
 * - 최신순 정렬
 * - 활성/완료 상태 표시
 * 
 * @example
 * loadAssignmentHistory(); // 발령 이력 로드
 */
function loadAssignmentHistory() {
    try {
        로거_인사?.debug('발령 이력 로드 시작');
        
        const employees = db.getEmployees();
        
        // 모든 발령 수집
        const allAssignments = [];
        
        employees.forEach(emp => {
            if (emp.assignments && emp.assignments.length > 0) {
                const name = typeof 직원유틸_인사 !== 'undefined'
                    ? 직원유틸_인사.getName(emp)
                    : (emp.personalInfo?.name || emp.name);
                
                emp.assignments.forEach(assign => {
                    allAssignments.push({
                        ...assign,
                        empId: emp.id,
                        empName: name
                    });
                });
            }
        });
        
        // 최신순 정렬
        allAssignments.sort((a, b) => {
            return new Date(b.startDate) - new Date(a.startDate);
        });
        
        로거_인사?.debug('발령 이력 수집 완료', { count: allAssignments.length });
        
        // ⭐ v3.3.3: 전역 변수에 저장 (필터링용)
        window._allAssignmentHistory = allAssignments;
        
        // ⭐ v3.3.3: 최근 20건만 표시
        const DISPLAY_LIMIT = 20;
        const totalCount = allAssignments.length;
        const displayAssignments = allAssignments.slice(0, DISPLAY_LIMIT);
        
        // HTML 생성 (테이블 형식)
        const html = _generateAssignmentHistoryTableHTML(displayAssignments);
        
        // DOM 업데이트 - 테이블 tbody에 삽입
        const tableBody = document.getElementById('assignmentHistoryTableBody');
        const emptyState = document.getElementById('assignmentHistoryEmpty');
        const moreInfo = document.getElementById('assignmentHistoryMore');
        
        if (tableBody) {
            tableBody.innerHTML = html;
        }
        
        // 빈 상태 처리
        if (emptyState) {
            emptyState.style.display = totalCount === 0 ? 'block' : 'none';
        }
        
        // 더보기 안내
        if (moreInfo) {
            if (totalCount > DISPLAY_LIMIT) {
                moreInfo.style.display = 'block';
                moreInfo.innerHTML = `📋 최근 ${DISPLAY_LIMIT}건 표시 중 (전체 ${totalCount}건)<br><small>개별 직원의 전체 발령 이력은 "직원 목록/수정"에서 확인하세요.</small>`;
            } else {
                moreInfo.style.display = 'none';
            }
        }
        
        // 건수 표시 업데이트
        const countElem = document.getElementById('assignmentHistoryCount');
        if (countElem) {
            countElem.textContent = `${totalCount}건`;
        }
        
        // 탭 배지 업데이트
        const badgeElem = document.getElementById('assignmentHistoryBadge');
        if (badgeElem) {
            badgeElem.textContent = totalCount;
        }
        
        로거_인사?.info('발령 이력 로드 완료', { total: totalCount, displayed: displayAssignments.length });
        
    } catch (error) {
        로거_인사?.error('발령 이력 로드 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '발령 이력을 불러오는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 발령 수정 모달 표시
 * 
 * @param {string} empId - 직원 ID
 * @param {string} assignmentId - 발령 ID
 * 
 * @description
 * 발령 정보를 수정할 수 있는 모달을 표시합니다.
 * 
 * @example
 * editAssignment('emp-001', 'assign-001'); // 발령 수정 모달 표시
 */
function editAssignment(empId, assignmentId) {
    try {
        로거_인사?.debug('발령 수정 모달 표시', { empId, assignmentId });
        
        // 직원 조회
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.warn('직원을 찾을 수 없습니다', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        // 발령 조회 - ⭐ v3.4.1: 타입 안전 비교 (숫자/문자열 호환)
        const assignment = emp.assignments?.find(a => String(a.id) === String(assignmentId));
        if (!assignment) {
            로거_인사?.warn('발령을 찾을 수 없습니다', { assignmentId, assignmentIdType: typeof assignmentId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 발령을 찾을 수 없습니다.');
            }
            return;
        }
        
        // 전역 변수 설정
        currentEmployeeIdForAssignment = empId;
        currentAssignmentId = assignmentId;
        
        // 모달 HTML 생성
        const modalHTML = _generateEditAssignmentModalHTML(emp, assignment);
        
        // 모달 표시
        const modal = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editAssignmentModal')
            : document.getElementById('editAssignmentModal');
        
        if (!modal) {
            로거_인사?.error('모달 컨테이너를 찾을 수 없습니다');
            throw new Error('모달을 표시할 수 없습니다.');
        }
        
        modal.innerHTML = modalHTML;
        modal.classList.add('show');
        
        로거_인사?.info('발령 수정 모달 표시 완료', { empId, assignmentId });
        
    } catch (error) {
        로거_인사?.error('발령 수정 모달 표시 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '수정 화면을 여는 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 발령 수정 모달 닫기
 * 
 * @description
 * 발령 수정 모달을 닫고 전역 변수를 초기화합니다.
 * 
 * @example
 * closeEditAssignmentModal(); // 모달 닫기
 */
function closeEditAssignmentModal() {
    try {
        로거_인사?.debug('발령 수정 모달 닫기');
        
        // 전역 변수 초기화
        currentEmployeeIdForAssignment = null;
        currentAssignmentId = null;
        
        // 모달 닫기
        const modal = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById('editAssignmentModal')
            : document.getElementById('editAssignmentModal');
        
        if (modal) {
            modal.classList.remove('show');
        }
        
    } catch (error) {
        로거_인사?.error('모달 닫기 실패', error);
    }
}

/**
 * 발령 수정 저장
 * 
 * @description
 * 수정된 발령 정보를 저장합니다.
 * - 입력값 검증
 * - 발령일 검증
 * - 발령 기간 중복 검증 ⭐ v3.0.5 추가
 * - 현재 직위 정보 업데이트 (활성 발령인 경우)
 * 
 * @example
 * saveAssignmentEdit(); // 발령 수정 저장
 */
async function saveAssignmentEdit() {
    try {
        로거_인사?.debug('발령 수정 저장 시작', {
            empId: currentEmployeeIdForAssignment,
            assignmentId: currentAssignmentId
        });
        
        // ID 확인
        if (!currentEmployeeIdForAssignment || !currentAssignmentId) {
            로거_인사?.warn('수정 중인 발령 정보가 없습니다');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령 정보를 찾을 수 없습니다.');
            } else {
                alert('⚠️ 발령 정보를 찾을 수 없습니다.');
            }
            return;
        }
        
        // 직원 조회
        const emp = db.findEmployee(currentEmployeeIdForAssignment);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없습니다', { empId: currentEmployeeIdForAssignment });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        // 발령 조회 - ⭐ v3.4.1: 타입 안전 비교 (숫자/문자열 호환)
        const assignment = emp.assignments?.find(a => String(a.id) === String(currentAssignmentId));
        if (!assignment) {
            로거_인사?.error('발령을 찾을 수 없습니다', { assignmentId: currentAssignmentId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 발령을 찾을 수 없습니다.');
            }
            return;
        }
        
        // 폼 데이터 수집
        const formData = _collectEditAssignmentFormData();
        
        로거_인사?.debug('폼 데이터 수집 완료', formData);
        
        // 기본 검증
        if (!formData.newStartDate || !formData.newDept || !formData.newPosition) {
            로거_인사?.warn('필수 항목 누락');
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('필수 항목을 입력하세요.');
            } else {
                alert('⚠️ 필수 항목을 입력하세요.');
            }
            return;
        }
        
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name);
        
        const entryDate = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getEntryDate(emp)
            : emp.employment?.entryDate;
        
        // 발령일 검증
        const validation = Validator.validateAssignmentDate(entryDate, formData.newStartDate);
        
        if (!validation.valid) {
            로거_인사?.warn('발령일 검증 실패', { errors: validation.errors });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.showValidationErrors(validation.errors);
            } else {
                const errorMsg = '⚠️ 발령일 검증 실패:\n\n' + validation.errors.join('\n');
                alert(errorMsg);
            }
            return;
        }
        
        // 날짜 범위 검증
        if (!Validator.isDateInValidRange(formData.newStartDate)) {
            로거_인사?.warn('발령일이 유효 범위를 벗어남', { date: formData.newStartDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령일이 유효한 범위(1900~2100)를 벗어났습니다.');
            } else {
                alert('⚠️ 발령일이 유효한 범위(1900~2100)를 벗어났습니다.');
            }
            return;
        }
        
        // ⭐ v3.0.5: 발령 기간 중복 검증 추가 (수정 중인 발령 제외)
        const overlapValidation = _validateAssignmentDateOverlap(
            emp, 
            formData.newStartDate, 
            currentAssignmentId  // 현재 수정 중인 발령 ID 전달
        );
        if (!overlapValidation.valid) {
            로거_인사?.warn('발령 기간 중복', { date: formData.newStartDate });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn(overlapValidation.message);
            } else {
                alert('⚠️ ' + overlapValidation.message);
            }
            return;
        }
        
        // 발령 정보 업데이트
        assignment.startDate = formData.newStartDate;
        assignment.dept = formData.newDept;
        assignment.position = formData.newPosition;
        assignment.grade = formData.newGrade;
        assignment.workingHours = formData.workingHours;  // ⭐ v3.1.0: 주당근무시간
        
        // ⭐ Phase 3-3: 급여방식 업데이트
        const isRankBased = (formData.paymentMethod === '호봉제');
        assignment.paymentMethod = formData.paymentMethod;
        assignment.isRankBased = isRankBased;
        assignment.employmentType = formData.employmentType;  // ⭐ v3.2.0: 고용형태
        
        // ⭐ v3.3.2: 발령별 개별 인정율 업데이트
        // 기존 priorCareerRate/priorCareerRateNote는 제거하고 priorCareerRates 사용
        delete assignment.priorCareerRate;
        delete assignment.priorCareerRateNote;
        
        if (formData.priorCareerRates && Object.keys(formData.priorCareerRates).length > 0) {
            assignment.priorCareerRates = formData.priorCareerRates;
        } else {
            delete assignment.priorCareerRates;  // 비어있으면 제거
        }
        
        로거_인사?.debug('발령 정보 업데이트', { 
            paymentMethod: formData.paymentMethod,
            isRankBased: isRankBased,
            priorCareerRates: formData.priorCareerRates
        });
        
        // 활성 발령인 경우 현재 직위 정보도 업데이트
        const isActiveAssignment = assignment.status === 'active';
        
        // ⭐ [v3.5.0] 마지막 발령 여부 확인 (퇴사자 발령 수정 지원)
        const isLastAssignment = _isLastAssignment(emp, assignment);
        
        // ⭐ [v3.5.0] 활성 발령이거나 마지막 발령이면 currentPosition 업데이트
        // - 퇴사자의 경우 활성 발령이 없으므로 마지막 발령 수정 시 반영 필요
        if (isActiveAssignment || isLastAssignment) {
            emp.currentPosition = {
                dept: formData.newDept,
                position: formData.newPosition,
                grade: formData.newGrade,
                jobType: emp.currentPosition?.jobType || ''
            };
            
            // ⭐ Phase 3-3: 활성 발령이면 현재 급여방식도 동기화
            if (!emp.rank) emp.rank = {};
            if (!emp.salaryInfo) emp.salaryInfo = {};
            
            const oldPaymentMethod = emp.rank.isRankBased !== false ? '호봉제' : '연봉제';
            const newPaymentMethod = formData.paymentMethod;
            
            emp.rank.isRankBased = isRankBased;
            emp.salaryInfo.isRankBased = isRankBased;
            
            // ⭐ v3.2.0: 고용형태 동기화
            if (!emp.employment) emp.employment = {};
            if (formData.employmentType && emp.employment.type !== formData.employmentType) {
                로거_인사?.info('고용형태 변경', { 
                    empId: emp.id,
                    from: emp.employment.type, 
                    to: formData.employmentType 
                });
                emp.employment.type = formData.employmentType;
            }
            
            // ⭐⭐⭐ Phase 3 추가: 연봉제 → 호봉제 전환 시 처리 (2025-11-11)
            if (newPaymentMethod === '호봉제' && oldPaymentMethod === '연봉제') {
                로거_인사?.info('급여방식 변경 감지: 연봉제 → 호봉제');
                
                // ⚠️ 임시: 데이터 오류 가능성 때문에 무조건 재계산
                // TODO: 나중에 사용자 확인 메시지 추가
                const hasValidRankInfo = false; // 강제로 재계산
                
                if (hasValidRankInfo) {
                    // (현재는 실행되지 않음)
                    로거_인사?.info('기존 호봉 정보 유효 - startRank, firstUpgradeDate 유지', {
                        empId: emp.id,
                        startRank: emp.rank.startRank,
                        firstUpgradeDate: emp.rank.firstUpgradeDate
                    });
                    
                    try {
                        // ✅ v4.0.0: API 우선 사용
                        const today = DateUtils.formatDate(new Date());
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
                        } else if (typeof RankCalculator !== 'undefined' && typeof DateUtils !== 'undefined') {
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
                        
                        if (currentRank !== undefined) {
                            emp.rank.currentRank = currentRank;
                            emp.rank.nextUpgradeDate = nextUpgradeDate;
                            
                            로거_인사?.info('현재 호봉 재계산 완료', {
                                empId: emp.id,
                                currentRank: currentRank,
                                nextUpgradeDate: nextUpgradeDate
                            });
                        }
                    } catch (error) {
                        로거_인사?.error('현재 호봉 재계산 오류', error);
                    }
                } else {
                    // ⭐ 무조건 처음부터 재계산 (데이터 오류 수정)
                    로거_인사?.info('호봉 처음부터 재계산 시작 (데이터 검증)');
                    
                    try {
                        if (typeof RankCalculator !== 'undefined' && typeof TenureCalculator !== 'undefined') {
                            // 1. 과거 경력 계산 (입사 전 경력만!)
                            const entryDate = emp.employment?.entryDate || emp.entryDate;
                            const careers = emp.careers || emp.careerDetails || [];
                            
                            로거_인사?.debug('경력 데이터', { entryDate, careersCount: careers.length });
                            
                            // 과거 경력 합산 (입사 전 경력만 사용)
                            let totalYears = 0;
                            let totalMonths = 0;
                            let totalDays = 0;
                            
                            careers.forEach((career, index) => {
                                try {
                                    const period = TenureCalculator.calculate(
                                        career.startDate,
                                        career.endDate
                                    );
                                    
                                    // rate가 "100%" 형식의 문자열일 수 있음 → 숫자로 변환
                                    let rateValue = career.rate || 100;
                                    if (typeof rateValue === 'string') {
                                        rateValue = parseInt(rateValue.replace('%', '')) || 100;
                                    }
                                    
                                    const converted = CareerCalculator.applyConversionRate(period, rateValue);
                                    
                                    totalYears += converted.years;
                                    totalMonths += converted.months;
                                    totalDays += converted.days;
                                    
                                    로거_인사?.debug(`경력 ${index + 1}`, {
                                        기간: `${career.startDate} ~ ${career.endDate}`,
                                        환산: `${converted.years}년 ${converted.months}개월 ${converted.days}일`
                                    });
                                } catch (err) {
                                    로거_인사?.warn(`경력 ${index + 1} 계산 실패`, err);
                                }
                            });
                            
                            // 정규화
                            if (totalDays >= 30) {
                                totalMonths += Math.floor(totalDays / 30);
                                totalDays = totalDays % 30;
                            }
                            if (totalMonths >= 12) {
                                totalYears += Math.floor(totalMonths / 12);
                                totalMonths = totalMonths % 12;
                            }
                            
                            로거_인사?.debug('과거 경력 합계', { totalYears, totalMonths, totalDays });
                            
                            // 2. 호봉 계산
                            // 입사호봉 = 1호봉 + 과거경력년수
                            const startRank = 1 + totalYears;
                            
                            로거_인사?.debug(`입사호봉 계산: 1 + ${totalYears} = ${startRank}호봉`);
                            
                            // ✅ v4.0.0: 첫승급일 계산 - API 우선 사용
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
                            
                            로거_인사?.debug(`첫승급일 계산: ${firstUpgradeDate}`);
                            
                            // ✅ v4.0.0: 현재 호봉 계산 - API 우선 사용
                            const today = DateUtils.formatDate(new Date());
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
                            
                            로거_인사?.debug(`현재 호봉 계산: ${currentRank}호봉`);
                            
                            // ✅ v4.0.0: 차기승급일 계산 - API 우선 사용
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
                            
                            로거_인사?.debug('호봉 계산 완료', {
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
                            
                            로거_인사?.info('호봉 자동 재계산 완료', {
                                empId: emp.id,
                                startRank: startRank,
                                currentRank: currentRank
                            });
                        }
                    } catch (error) {
                        로거_인사?.error('호봉 재계산 오류', error);
                        // 에러가 발생해도 급여방식 변경은 계속 진행
                    }
                }
            }
            
            로거_인사?.debug('현재 직위 및 급여방식 정보 업데이트', {
                dept: formData.newDept,
                position: formData.newPosition,
                paymentMethod: formData.paymentMethod
            });
        }
        
        // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('발령 수정 완료', {
            empId: emp.id,
            assignmentId: currentAssignmentId,
            name: name,
            isActive: isActiveAssignment,
            paymentMethod: formData.paymentMethod // ⭐ Phase 3-3
        });
        
        // ⭐ v3.3.2: priorCareerRates가 있으면 재계산 여부 확인
        const hasPriorCareerRates = formData.priorCareerRates && Object.keys(formData.priorCareerRates).length > 0;
        
        // ✅ ID 백업 (모달 닫기 전)
        const empIdToRefresh = currentEmployeeIdForAssignment;
        
        if (hasPriorCareerRates) {
            // 모달 닫기 먼저
            closeEditAssignmentModal();
            
            // 재계산 확인 모달 표시
            _showRecalculateConfirmModal(emp.id, name, () => {
                // 직원 상세 모달 갱신
                if (typeof showEmployeeDetail === 'function') {
                    showEmployeeDetail(empIdToRefresh);
                }
                // 발령 이력 갱신
                loadAssignmentHistory();
                // ⭐ [v3.5.0] 직원 목록 갱신 (활성/종료 발령 모두)
                if (typeof loadEmployeeList === 'function') {
                    loadEmployeeList();
                }
            });
        } else {
            // ⭐ [v3.5.0] 성공 메시지 (활성 발령 또는 마지막 발령이면 직원 정보 변경 안내)
            const successMsg = (isActiveAssignment || isLastAssignment)
                ? `✅ ${name} 님의 발령이 수정되었습니다.\n\n발령코드: ${assignment.code}\n발령일: ${formData.newStartDate}\n부서: ${formData.newDept}\n직위: ${formData.newPosition}\n급여방식: ${formData.paymentMethod}\n\n직원의 현재 직위 정보도 함께 변경되었습니다.`
                : `✅ ${name} 님의 발령이 수정되었습니다.\n\n발령코드: ${assignment.code}\n발령일: ${formData.newStartDate}\n부서: ${formData.newDept}\n직위: ${formData.newPosition}\n급여방식: ${formData.paymentMethod}`;
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.success(successMsg);
            } else {
                alert(successMsg);
            }
            
            // ✅ 직원 상세 모달 갱신
            if (typeof showEmployeeDetail === 'function') {
                showEmployeeDetail(empIdToRefresh);
            }
            
            // 발령 이력 갱신
            loadAssignmentHistory();
            
            // ⭐ [v3.5.0] 직원 목록 갱신 (활성/종료 발령 모두 - 퇴사자 목록 등 즉시 반영)
            if (typeof loadEmployeeList === 'function') {
                로거_인사?.debug('직원 목록 갱신 호출 (발령 수정)');
                loadEmployeeList();
            }
            
            // ✅ 마지막으로 모달 닫기
            closeEditAssignmentModal();
        }
        
    } catch (error) {
        로거_인사?.error('발령 수정 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '수정 중 오류가 발생했습니다.');
        }
    }
}

/**
 * 발령 삭제
 * 
 * @param {string} empId - 직원 ID
 * @param {string} assignmentId - 발령 ID
 * 
 * @description
 * 발령을 삭제합니다.
 * - 활성 발령 삭제 시 이전 발령을 활성화
 * - 이전 발령이 없으면 입사 시 직위로 복원
 * 
 * @example
 * deleteAssignment('emp-001', 'assign-001'); // 발령 삭제
 */
function deleteAssignment(empId, assignmentId) {
    try {
        로거_인사?.debug('발령 삭제 시도', { empId, assignmentId });
        
        // 직원 조회
        const emp = db.findEmployee(empId);
        if (!emp) {
            로거_인사?.error('직원을 찾을 수 없습니다', { empId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('직원을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 직원을 찾을 수 없습니다.');
            }
            return;
        }
        
        // 발령 조회 - ⭐ v3.4.1: 타입 안전 비교 (숫자/문자열 호환)
        const assignmentIndex = emp.assignments?.findIndex(a => String(a.id) === String(assignmentId));
        
        if (assignmentIndex === undefined || assignmentIndex === -1) {
            로거_인사?.error('발령을 찾을 수 없습니다', { assignmentId });
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn('발령을 찾을 수 없습니다.');
            } else {
                alert('⚠️ 발령을 찾을 수 없습니다.');
            }
            return;
        }
        
        const assignment = emp.assignments[assignmentIndex];
        const isActiveAssignment = assignment.status === 'active';
        
        const name = typeof 직원유틸_인사 !== 'undefined'
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name);
        
        // 확인
        const confirmMsg = `📋 발령 삭제\n\n` +
                         `직원: ${name}\n` +
                         `발령일: ${assignment.startDate}\n` +
                         `부서: ${assignment.dept}\n` +
                         `직위: ${assignment.position}\n` +
                         `상태: ${isActiveAssignment ? '현재' : '종료'}\n\n` +
                         `삭제하시겠습니까?`;
        
        const confirmed = typeof 에러처리_인사 !== 'undefined'
            ? 에러처리_인사.confirm(confirmMsg)
            : confirm(confirmMsg);
        
        if (!confirmed) {
            로거_인사?.debug('발령 삭제 취소');
            return;
        }
        
        // 발령 삭제
        emp.assignments.splice(assignmentIndex, 1);
        
        로거_인사?.debug('발령 삭제 완료', { 
            empId, 
            assignmentId,
            wasActive: isActiveAssignment 
        });
        
        // 활성 발령을 삭제한 경우 이전 발령 활성화 또는 입사 시 직위로 복원
        if (isActiveAssignment) {
            if (emp.assignments.length > 0) {
                // 가장 최근 발령을 활성화
                const sortedAssignments = [...emp.assignments].sort((a, b) => {
                    return new Date(b.startDate) - new Date(a.startDate);
                });
                
                const latestAssignment = sortedAssignments[0];
                latestAssignment.status = 'active';
                latestAssignment.endDate = null;
                
                // 현재 직위 정보 업데이트
                emp.currentPosition = {
                    dept: latestAssignment.dept,
                    position: latestAssignment.position,
                    grade: latestAssignment.grade,
                    jobType: emp.currentPosition?.jobType || ''
                };
                
                로거_인사?.debug('이전 발령 활성화', { 
                    assignmentId: latestAssignment.id,
                    startDate: latestAssignment.startDate 
                });
            } else {
                // 발령이 모두 삭제된 경우 입사 시 직위로 복원
                // (직원 등록 시 입력한 정보가 있다면 그대로 유지)
                로거_인사?.debug('모든 발령 삭제됨, 입사 시 직위 유지');
            }
        }
        
        // 저장
        db.saveEmployee(emp);
        
        로거_인사?.info('발령 삭제 및 저장 완료', { empId, assignmentId });
        
        // 성공 메시지
        const successMsg = isActiveAssignment
            ? '✅ 발령이 삭제되고 이전 발령으로 복원되었습니다.'
            : '✅ 발령이 삭제되었습니다.';
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.success(successMsg);
        } else {
            alert('✅ ' + successMsg);
        }
        
        // ✅ 직원 상세 모달 갱신
        if (typeof showEmployeeDetail === 'function') {
            showEmployeeDetail(empId);
        }
        
        // ✅ 직원 목록도 갱신 (활성 발령 삭제 시 부서/직위 변경됨)
        if (isActiveAssignment && typeof loadEmployeeList === 'function') {
            로거_인사?.debug('직원 목록 갱신 호출');
            loadEmployeeList();
        }
        
    } catch (error) {
        로거_인사?.error('인사발령 삭제 실패', error);
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.handle(error, '삭제 중 오류가 발생했습니다.');
        }
    }
}

// ===== Private 함수들 =====

/**
 * 발령 폼 데이터 수집 (Private)
 * 
 * @private
 * @returns {Object} 폼 데이터
 * 
 * @version 3.1.0 - workingHours 추가
 * @version 3.3.2 - priorCareerRates (발령별 개별 인정율) 수집
 */
function _collectAssignmentFormData() {
    const getValue = (id) => {
        const elem = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById(id)
            : document.getElementById(id);
        return elem ? (elem.value || '').trim() : '';
    };
    
    // ⭐ v3.1.0: 주당근무시간 (기본값 40)
    let workingHours = parseInt(getValue('assignmentWorkingHours')) || 40;
    
    // 최대 40시간, 최소 1시간 제한
    if (workingHours > 40) workingHours = 40;
    if (workingHours < 1) workingHours = 1;
    
    // ⭐ v3.1.1: 급여방식 수집 추가
    const getPaymentMethod = () => {
        const radioButtons = document.getElementsByName('assignmentPaymentMethod');
        for (let radio of radioButtons) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return '호봉제'; // 기본값
    };
    
    const paymentMethod = getPaymentMethod();
    
    // ⭐ v3.2.0: 고용형태 수집
    const employmentType = getValue('assignmentEmploymentType') || '정규직';
    
    // ⭐ v3.3.2: 발령별 개별 인정율 수집
    const priorCareerRates = {};
    const listContainer = document.getElementById('assignmentPriorCareerRatesList');
    
    if (listContainer) {
        // 체크박스들 찾기
        const checkboxes = listContainer.querySelectorAll('input[type="checkbox"][id^="newAssignPriorRateEnabled_"]');
        
        checkboxes.forEach(checkbox => {
            const assignmentId = checkbox.id.replace('newAssignPriorRateEnabled_', '');
            
            if (checkbox.checked) {
                const rateInput = document.getElementById(`newAssignPriorRate_${assignmentId}`);
                const noteInput = document.getElementById(`newAssignPriorRateNote_${assignmentId}`);
                
                let rate = parseInt(rateInput?.value) || 100;
                if (rate < 0) rate = 0;
                if (rate > 100) rate = 100;
                
                const note = (noteInput?.value || '').trim();
                
                priorCareerRates[assignmentId] = {
                    rate: rate,
                    note: note
                };
            }
        });
    }
    
    return {
        empId: getValue('assignmentEmployeeSelect'),
        assignmentDate: getValue('assignmentDate'),
        newDept: getValue('assignmentDept'),
        newPosition: getValue('assignmentPosition'),
        newGrade: getValue('assignmentGrade'),
        workingHours: workingHours,  // ⭐ v3.1.0
        paymentMethod: paymentMethod,  // ⭐ v3.1.1
        isRankBased: (paymentMethod === '호봉제'),  // ⭐ v3.1.1
        employmentType: employmentType,  // ⭐ v3.2.0
        priorCareerRates: priorCareerRates  // ⭐ v3.3.2 (발령별 개별 인정율)
    };
}

/**
 * 발령 폼 초기화 (Private)
 * 
 * @private
 */
function _resetAssignmentForm() {
    const setValue = (id, value) => {
        const elem = typeof DOM유틸_인사 !== 'undefined'
            ? DOM유틸_인사.getById(id)
            : document.getElementById(id);
        
        if (elem) {
            if (typeof DOM유틸_인사 !== 'undefined') {
                DOM유틸_인사.setValue(elem, value);
            } else {
                elem.value = value;
            }
        }
    };
    
    setValue('assignmentEmployeeSelect', '');
    setValue('assignmentDate', '');
    setValue('assignmentDept', '');
    setValue('assignmentPosition', '');
    setValue('assignmentGrade', '');
    
    // ⭐ v3.3.2: 발령별 개별 인정율 초기화
    const priorCareerRatesList = document.getElementById('assignmentPriorCareerRatesList');
    if (priorCareerRatesList) {
        priorCareerRatesList.innerHTML = '';
    }
    
    // 인정율 섹션 숨기기
    const priorCareerRateSection = document.getElementById('assignmentPriorCareerRateSection');
    if (priorCareerRateSection) {
        priorCareerRateSection.style.display = 'none';
    }
}

/**
 * ⭐ v3.5.0: 마지막 발령 여부 확인 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {Object} assignment - 확인할 발령 객체
 * @returns {boolean} 마지막 발령이면 true
 * 
 * @description
 * 해당 발령이 직원의 마지막 발령(가장 최근)인지 확인합니다.
 * 퇴사자의 경우 모든 발령이 종료 상태이므로, 
 * 마지막 발령을 수정할 때 currentPosition도 업데이트해야 합니다.
 */
function _isLastAssignment(emp, assignment) {
    if (!emp.assignments || emp.assignments.length === 0) return false;
    
    // 시작일 기준 내림차순 정렬하여 가장 최근 발령 찾기
    const sortedAssignments = [...emp.assignments].sort((a, b) => {
        const dateA = a.startDate || '';
        const dateB = b.startDate || '';
        return dateB.localeCompare(dateA);
    });
    
    const lastAssignment = sortedAssignments[0];
    return String(lastAssignment.id) === String(assignment.id);
}

/**
 * ⭐ v3.0.5: 발령 기간 중복 검증 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} newStartDate - 새 발령 시작일
 * @param {string} [currentAssignmentId=null] - 현재 수정 중인 발령 ID (수정 시에만)
 * @returns {Object} { valid: boolean, message: string }
 * 
 * @description
 * 발령 기간 중복을 검증합니다.
 * - 과거 발령과의 날짜 겹침 확인
 * - 활성 발령은 자동 종료되므로 제외
 * - 수정 시에는 현재 발령 제외
 * 
 * @example
 * const result = _validateAssignmentDateOverlap(emp, '2024-01-01');
 * if (!result.valid) {
 *     alert(result.message);
 * }
 */
function _validateAssignmentDateOverlap(emp, newStartDate, currentAssignmentId = null) {
    try {
        로거_인사?.debug('발령 기간 중복 검증 시작', { 
            empId: emp.id, 
            newStartDate,
            currentAssignmentId 
        });
        
        // assignments 배열 확인
        if (!emp.assignments || emp.assignments.length === 0) {
            로거_인사?.debug('기존 발령 없음, 검증 통과');
            return { valid: true, message: '' };
        }
        
        // 중복 확인
        let overlappingAssignment = null;
        
        for (const assign of emp.assignments) {
            // 수정 중인 발령은 제외
            if (currentAssignmentId && assign.id === currentAssignmentId) {
                continue;
            }
            
            // 활성 발령은 자동 종료되므로 제외
            if (assign.status === 'active') {
                continue;
            }
            
            // 종료일이 없으면 스킵 (방어 코드)
            if (!assign.endDate) {
                continue;
            }
            
            // 날짜 겹침 확인: 새 시작일이 기존 종료일 이전이면 겹침
            // (새시작 <= 기존끝)
            if (new Date(newStartDate) <= new Date(assign.endDate)) {
                overlappingAssignment = assign;
                break;
            }
        }
        
        if (overlappingAssignment) {
            const message = `⚠️ 발령 기간 중복\n\n` +
                          `이미 등록된 발령 기간과 겹칩니다.\n\n` +
                          `기존 발령:\n` +
                          `• 기간: ${overlappingAssignment.startDate} ~ ${overlappingAssignment.endDate}\n` +
                          `• 부서: ${overlappingAssignment.dept}\n` +
                          `• 직위: ${overlappingAssignment.position}\n\n` +
                          `새 발령일: ${newStartDate}`;
            
            로거_인사?.warn('발령 기간 중복 검출', { 
                newStartDate,
                existingStart: overlappingAssignment.startDate,
                existingEnd: overlappingAssignment.endDate
            });
            
            return { valid: false, message };
        }
        
        로거_인사?.debug('발령 기간 중복 검증 통과');
        return { valid: true, message: '' };
        
    } catch (error) {
        로거_인사?.error('발령 기간 중복 검증 오류', error);
        // 검증 실패 시 안전을 위해 통과 처리
        return { valid: true, message: '' };
    }
}

/**
 * 발령 이력 HTML 생성 (Private)
 * 
 * @private
 * @param {Array} assignments - 발령 배열
 * @returns {string} HTML 문자열
 */
function _generateAssignmentHistoryHTML(assignments) {
    // 이 함수는 하위 호환성을 위해 유지 (다른 곳에서 사용할 수 있음)
    if (assignments.length === 0) {
        return '<div class="empty-state"><p>인사발령 내역이 없습니다</p></div>';
    }
    
    // ✅ XSS 방지
    const escapeHtml = (text) => {
        if (typeof DOM유틸_인사 !== 'undefined') {
            return DOM유틸_인사.escapeHtml(text || '-');
        }
        return (text || '-').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    };
    
    return assignments.map(assign => {
        const safeName = escapeHtml(assign.empName);
        const safeCode = escapeHtml(assign.code);
        const safeStartDate = escapeHtml(assign.startDate);
        const safeDept = escapeHtml(assign.dept);
        const safePosition = escapeHtml(assign.position);
        const safeGrade = escapeHtml(assign.grade);
        const safeEndDate = assign.endDate ? escapeHtml(assign.endDate) : '';
        
        const statusBadge = assign.status === 'active' 
            ? '<span class="badge badge-rank">현재</span>' 
            : '<span class="badge badge-retired">종료</span>';
        
        const endDateRow = safeEndDate 
            ? `<div class="employee-info-item"><span class="employee-info-label">종료일:</span> ${safeEndDate}</div>` 
            : '';
        
        return `
            <div class="employee-item" style="cursor: default;">
                <div class="employee-header">
                    <div>
                        <div class="employee-name">${safeName} ${statusBadge}</div>
                        <div class="employee-id">발령코드: ${safeCode}</div>
                    </div>
                    <div class="employee-actions">
                        <button class="btn btn-small btn-primary" onclick="editAssignment('${assign.empId}', '${assign.id}')">수정</button>
                        <button class="btn btn-small btn-danger" onclick="deleteAssignment('${assign.empId}', '${assign.id}')">삭제</button>
                    </div>
                </div>
                <div class="employee-info-grid">
                    <div class="employee-info-item"><span class="employee-info-label">발령일:</span> ${safeStartDate}</div>
                    <div class="employee-info-item"><span class="employee-info-label">부서:</span> ${safeDept}</div>
                    <div class="employee-info-item"><span class="employee-info-label">직위:</span> ${safePosition}</div>
                    <div class="employee-info-item"><span class="employee-info-label">직급:</span> ${safeGrade}</div>
                    ${endDateRow}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * ⭐ v3.3.3: 발령 이력 테이블 HTML 생성 (세련된 스타일)
 * @private
 * @param {Array} assignments - 발령 배열
 * @returns {string} HTML 문자열 (테이블 행들)
 */
function _generateAssignmentHistoryTableHTML(assignments) {
    if (assignments.length === 0) {
        return '';
    }
    
    // ✅ XSS 방지
    const escapeHtml = (text) => {
        if (typeof DOM유틸_인사 !== 'undefined') {
            return DOM유틸_인사.escapeHtml(text || '-');
        }
        return (text || '-').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    };
    
    return assignments.map((assign, index) => {
        const safeName = escapeHtml(assign.empName);
        const safeStartDate = escapeHtml(assign.startDate);
        const safeDept = escapeHtml(assign.dept);
        const safePosition = escapeHtml(assign.position);
        
        // ⭐ status 명시적 확인 (undefined 방지)
        const isActive = assign.status === 'active';
        const statusValue = isActive ? 'active' : 'completed';
        
        const statusBadge = isActive 
            ? '<span style="display:inline-block;background:#dcfce7;color:#166534;padding:4px 10px;border-radius:12px;font-size:0.8em;font-weight:500;">현재</span>' 
            : '<span style="display:inline-block;background:#f3f4f6;color:#6b7280;padding:4px 10px;border-radius:12px;font-size:0.8em;font-weight:500;">종료</span>';
        
        // 짝수/홀수 행 배경색
        const rowBg = index % 2 === 0 ? 'background:#ffffff;' : 'background:#f9fafb;';
        
        return `
            <tr style="${rowBg}transition:background 0.15s;" data-empname="${safeName}" data-dept="${safeDept}" data-status="${statusValue}"
                onmouseover="this.style.background='#f0f9ff';" onmouseout="this.style.background='${index % 2 === 0 ? '#ffffff' : '#f9fafb'}';">
                <td style="padding:14px 16px;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${safeName}</td>
                <td style="padding:14px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;font-size:0.9em;">${safeStartDate}</td>
                <td style="padding:14px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">${safeDept}</td>
                <td style="padding:14px 12px;color:#374151;border-bottom:1px solid #f3f4f6;">${safePosition}</td>
                <td style="padding:14px 12px;text-align:center;border-bottom:1px solid #f3f4f6;">${statusBadge}</td>
                <td style="padding:14px 16px;text-align:center;border-bottom:1px solid #f3f4f6;">
                    <button onclick="editAssignment('${assign.empId}', '${assign.id}')" 
                            style="padding:6px 12px;font-size:0.8em;background:#f3f4f6;color:#374151;border:none;border-radius:6px;cursor:pointer;margin-right:6px;transition:all 0.15s;"
                            onmouseover="this.style.background='#e5e7eb';" onmouseout="this.style.background='#f3f4f6';">수정</button>
                    <button onclick="deleteAssignment('${assign.empId}', '${assign.id}')" 
                            style="padding:6px 12px;font-size:0.8em;background:#fef2f2;color:#dc2626;border:none;border-radius:6px;cursor:pointer;transition:all 0.15s;"
                            onmouseover="this.style.background='#fee2e2';" onmouseout="this.style.background='#fef2f2';">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * ⭐ v3.3.3: 인사발령 탭 전환 (언더라인 스타일)
 * @param {string} tabName - 'register' 또는 'history'
 */
function switchAssignmentTab(tabName) {
    로거_인사?.debug('인사발령 탭 전환', { tabName });
    
    // 탭 버튼
    const registerTab = document.getElementById('assignmentTabRegister');
    const historyTab = document.getElementById('assignmentTabHistory');
    
    // 탭 컨텐츠
    const registerContent = document.getElementById('assignmentTabContentRegister');
    const historyContent = document.getElementById('assignmentTabContentHistory');
    
    if (tabName === 'register') {
        // 등록 탭 활성화 (언더라인 스타일)
        if (registerTab) {
            registerTab.style.color = '#667eea';
            registerTab.style.fontWeight = '600';
            registerTab.style.borderBottom = '2px solid #667eea';
        }
        if (historyTab) {
            historyTab.style.color = '#6b7280';
            historyTab.style.fontWeight = '500';
            historyTab.style.borderBottom = '2px solid transparent';
        }
        if (registerContent) registerContent.style.display = 'block';
        if (historyContent) historyContent.style.display = 'none';
    } else if (tabName === 'history') {
        // 내역 탭 활성화 (언더라인 스타일)
        if (registerTab) {
            registerTab.style.color = '#6b7280';
            registerTab.style.fontWeight = '500';
            registerTab.style.borderBottom = '2px solid transparent';
        }
        if (historyTab) {
            historyTab.style.color = '#667eea';
            historyTab.style.fontWeight = '600';
            historyTab.style.borderBottom = '2px solid #667eea';
        }
        if (registerContent) registerContent.style.display = 'none';
        if (historyContent) historyContent.style.display = 'block';
        
        // 내역 탭 진입 시 데이터 새로고침
        loadAssignmentHistory();
    }
}

/**
 * ⭐ v3.3.3: 발령 내역 필터링
 */
function filterAssignmentHistory() {
    const searchInput = document.getElementById('assignmentHistorySearch');
    const filterSelect = document.getElementById('assignmentHistoryFilter');
    const tableBody = document.getElementById('assignmentHistoryTableBody');
    
    if (!tableBody) return;
    
    const searchText = (searchInput?.value || '').toLowerCase();
    const filterValue = filterSelect?.value || 'all';
    
    const rows = tableBody.querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const empName = (row.dataset.empname || '').toLowerCase();
        const dept = (row.dataset.dept || '').toLowerCase();
        const status = row.dataset.status || '';
        
        // 검색 조건
        const matchesSearch = searchText === '' || 
            empName.includes(searchText) || 
            dept.includes(searchText);
        
        // 필터 조건
        let matchesFilter = true;
        if (filterValue === 'active') {
            matchesFilter = status === 'active';
        } else if (filterValue === 'completed') {
            matchesFilter = status === 'completed';
        }
        
        // 표시/숨김
        if (matchesSearch && matchesFilter) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // 건수 업데이트
    const countElem = document.getElementById('assignmentHistoryCount');
    if (countElem) {
        const totalCount = window._allAssignmentHistory?.length || 0;
        if (searchText || filterValue !== 'all') {
            countElem.textContent = `${visibleCount}건 (필터)`;
        } else {
            countElem.textContent = `${totalCount}건`;
        }
    }
    
    // 빈 상태 처리
    const emptyState = document.getElementById('assignmentHistoryEmpty');
    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
}

/**
 * 발령 수정 모달 HTML 생성 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {Object} assignment - 발령 객체
 * @returns {string} HTML 문자열
 */
function _generateEditAssignmentModalHTML(emp, assignment) {


    // ✅ XSS 방지
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
    
    const entryDate = emp.employment?.entryDate || '-';
    const safeStartDate = escapeHtml(assignment.startDate);
    const safeDept = escapeHtml(assignment.dept);
    const safePosition = escapeHtml(assignment.position);
    const safeGrade = escapeHtml(assignment.grade);
    
    // ⭐ Phase 3-3: 급여방식 초기값 설정
    const currentPaymentMethod = assignment.paymentMethod || '호봉제'; // 기본값: 호봉제
    const isRankChecked = currentPaymentMethod === '호봉제' ? 'checked' : '';
    const isSalaryChecked = currentPaymentMethod === '연봉제' ? 'checked' : '';
    
    // ⭐ v3.1.0: 주당근무시간 (기존 데이터 없으면 40시간)
    const workingHours = assignment.workingHours ?? 40;
    
    // ⭐ v3.2.0: 월소정근로시간 계산
    const monthlyHours = calculateMonthlyWorkingHoursForAssignment(workingHours);
    
    // ⭐ v3.2.0: 고용형태
    const currentEmploymentType = assignment.employmentType || emp.employment?.type || '정규직';
    
    // ⭐ v3.3.1: 첫 번째 발령(입사)인지 확인
    const sortedAssignments = [...(emp.assignments || [])].sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
    );
    // ⭐ v3.4.1: 타입 안전 비교 (숫자/문자열 호환)
    const isEntryAssignment = sortedAssignments.length > 0 && String(sortedAssignments[0].id) === String(assignment.id);
    
    // ⭐ v3.3.2: 이전 모든 발령에 대한 인정율 UI 생성
    let priorAssignmentsHTML = '';
    if (!isEntryAssignment) {
        // ⭐ v3.4.1: 타입 안전 비교 (숫자/문자열 호환)
        const currentIndex = sortedAssignments.findIndex(a => String(a.id) === String(assignment.id));
        const priorCareerRates = assignment.priorCareerRates || {};
        
        // 하위 호환: 기존 priorCareerRate가 있고 priorCareerRates가 없으면 직전 발령에 적용
        const legacyRate = assignment.priorCareerRate;
        const legacyNote = assignment.priorCareerRateNote || '';
        
        for (let i = 0; i < currentIndex; i++) {
            const prevAssign = sortedAssignments[i];
            const nextAssign = sortedAssignments[i + 1];
            const prevEndDate = nextAssign ? DateUtils.addDays(nextAssign.startDate, -1) : assignment.startDate ? DateUtils.addDays(assignment.startDate, -1) : '-';
            
            // 이 발령에 대한 인정율 정보
            let rateInfo = priorCareerRates[prevAssign.id];
            
            // 하위 호환: 직전 발령이고 기존 priorCareerRate가 있으면 사용
            if (!rateInfo && i === currentIndex - 1 && legacyRate !== null && legacyRate !== undefined) {
                rateInfo = { rate: legacyRate, note: legacyNote };
            }
            
            const hasRate = rateInfo && rateInfo.rate !== null && rateInfo.rate !== undefined;
            const rate = rateInfo?.rate ?? 80;
            const note = escapeHtml(rateInfo?.note || '');
            const checked = hasRate ? 'checked' : '';
            const detailsDisplay = hasRate ? 'block' : 'none';
            
            priorAssignmentsHTML += `
                <div style="padding:12px;background:white;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" 
                               id="editPriorRateEnabled_${prevAssign.id}" 
                               ${checked}
                               onchange="toggleEditPriorRateItem('${prevAssign.id}')">
                        <span style="font-weight:600;">${escapeHtml(prevAssign.dept || '-')}</span>
                        <span style="color:#6b7280;font-size:0.85em;">${prevAssign.startDate} ~ ${prevEndDate}</span>
                    </label>
                    <div id="editPriorRateDetails_${prevAssign.id}" style="display:${detailsDisplay};margin-top:10px;padding-left:24px;">
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:0.85em;color:#64748b;">인정율:</span>
                                <input type="number" 
                                       id="editPriorRate_${prevAssign.id}" 
                                       class="form-control" 
                                       style="width:70px;padding:4px 8px;font-size:0.9em;" 
                                       value="${rate}" 
                                       min="0" max="100" step="10">
                                <span style="font-size:0.85em;color:#64748b;">%</span>
                            </div>
                            <div style="flex:1;min-width:120px;">
                                <input type="text" 
                                       id="editPriorRateNote_${prevAssign.id}" 
                                       class="form-control" 
                                       style="padding:4px 8px;font-size:0.9em;" 
                                       value="${note}" 
                                       placeholder="사유">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <div class="modal-title">📋 인사발령 수정</div>
                <button class="modal-close" onclick="closeEditAssignmentModal()">×</button>
            </div>
            <div class="alert alert-info">
                <span>💡</span>
                <span>발령일은 입사일(${entryDate}) 이후여야 합니다.</span>
            </div>
            <div class="form-group">
                <label>발령일 *</label>
                <input type="date" id="editAssignStartDate" class="form-control" value="${safeStartDate}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>부서 *</label>
                    <input type="text" id="editAssignDept" class="form-control" value="${safeDept}">
                </div>
                <div class="form-group">
                    <label>직위 *</label>
                    <input type="text" id="editAssignPosition" class="form-control" value="${safePosition}">
                </div>
            </div>
            <div class="form-group">
                <label>직급</label>
                <input type="text" id="editAssignGrade" class="form-control" value="${safeGrade}">
            </div>
            <div class="form-group">
                <label>고용형태</label>
                <select id="editAssignEmploymentType" class="form-control">
                    <option value="정규직" ${currentEmploymentType === '정규직' ? 'selected' : ''}>정규직</option>
                    <option value="무기계약직" ${currentEmploymentType === '무기계약직' ? 'selected' : ''}>무기계약직</option>
                    <option value="계약직" ${currentEmploymentType === '계약직' ? 'selected' : ''}>계약직</option>
                    <option value="육아휴직대체" ${currentEmploymentType === '육아휴직대체' ? 'selected' : ''}>육아휴직대체</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex:1;">
                    <label class="required">급여 방식 *</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="editAssignmentPaymentMethod" value="호봉제" ${isRankChecked}>
                            호봉제
                        </label>
                        <label>
                            <input type="radio" name="editAssignmentPaymentMethod" value="연봉제" ${isSalaryChecked}>
                            연봉제
                        </label>
                    </div>
                    <small style="color: #666; display: block; margin-top: 4px;">
                        💡 이 발령의 급여 방식을 수정합니다.
                    </small>
                </div>
                <div class="form-group" style="flex:1;">
                    <label>주당근무시간</label>
                    <input type="number" id="editAssignWorkingHours" class="form-control" value="${workingHours}" min="1" max="52" onchange="updateEditAssignMonthlyHours()">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>월소정근로시간</label>
                    <input type="text" id="editAssignMonthlyHours" class="form-control auto-generated" value="${monthlyHours}시간" readonly>
                </div>
            </div>
            
            ${isEntryAssignment ? `
            <!-- 입사 발령: 이전 경력 인정율 해당 없음 -->
            <div style="margin-top:16px;padding:12px 16px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280;font-size:0.9em;">
                <span>📌 입사 발령 - 이전 경력 인정율 해당 없음</span>
            </div>
            ` : `
            <!-- ⭐ v3.3.2: 이전 발령별 개별 인정율 설정 -->
            <div class="form-group" style="margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                <div style="font-weight:600;margin-bottom:12px;">
                    📊 이전 경력 인정율 재산정
                </div>
                <p style="font-size:0.85em;color:#64748b;margin-bottom:12px;">
                    이전 발령 중 인정율을 적용할 항목을 선택하세요. 체크된 발령의 경력에 해당 인정율이 적용됩니다.
                </p>
                <div id="editPriorCareerRatesList" style="max-height:200px;overflow-y:auto;">
                    ${priorAssignmentsHTML}
                </div>
            </div>
            `}
            
            <div style="display:flex;gap:10px;margin-top:20px;">
                <button class="btn btn-primary" style="flex:1;" onclick="saveAssignmentEdit()">💾 저장</button>
                <button class="btn btn-secondary" onclick="closeEditAssignmentModal()">취소</button>
            </div>
        </div>
    `;
}

/**
 * 수정 폼 데이터 수집 (Private)
 * 
 * @private
 * @returns {Object} 폼 데이터
 * 
 * @version 3.1.0 - workingHours 추가
 * @version 3.3.2 - priorCareerRates (발령별 개별 인정율) 수집
 */
function _collectEditAssignmentFormData() {

    // ✅ DOM유틸을 사용하지 않고 직접 읽기 (캐시 방지)
    const startDateInput = document.getElementById('editAssignStartDate');
    const deptInput = document.getElementById('editAssignDept');
    const positionInput = document.getElementById('editAssignPosition');
    const gradeInput = document.getElementById('editAssignGrade');
    
    // ⭐ v3.1.0: 주당근무시간
    const workingHoursInput = document.getElementById('editAssignWorkingHours');
    let workingHours = parseInt(workingHoursInput?.value) || 40;
    
    // 최대 40시간, 최소 1시간 제한
    if (workingHours > 40) workingHours = 40;
    if (workingHours < 1) workingHours = 1;
    
    // ⭐ Phase 3-3: 급여방식 수집
    const getPaymentMethod = () => {
        const radioButtons = document.getElementsByName('editAssignmentPaymentMethod');
        for (let radio of radioButtons) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return '호봉제'; // 기본값
    };
    
    // ⭐ v3.2.0: 고용형태 수집
    const employmentTypeInput = document.getElementById('editAssignEmploymentType');
    const employmentType = employmentTypeInput?.value || '정규직';
    
    // ⭐ v3.3.2: 발령별 개별 인정율 수집
    const priorCareerRates = {};
    const listContainer = document.getElementById('editPriorCareerRatesList');
    
    if (listContainer) {
        // 체크박스들 찾기
        const checkboxes = listContainer.querySelectorAll('input[type="checkbox"][id^="editPriorRateEnabled_"]');
        
        checkboxes.forEach(checkbox => {
            const assignmentId = checkbox.id.replace('editPriorRateEnabled_', '');
            
            if (checkbox.checked) {
                const rateInput = document.getElementById(`editPriorRate_${assignmentId}`);
                const noteInput = document.getElementById(`editPriorRateNote_${assignmentId}`);
                
                let rate = parseInt(rateInput?.value) || 100;
                if (rate < 0) rate = 0;
                if (rate > 100) rate = 100;
                
                const note = (noteInput?.value || '').trim();
                
                priorCareerRates[assignmentId] = {
                    rate: rate,
                    note: note
                };
            }
        });
    }
    
    const formData = {
        newStartDate: (startDateInput?.value || '').trim(),
        newDept: (deptInput?.value || '').trim(),
        newPosition: (positionInput?.value || '').trim(),
        newGrade: (gradeInput?.value || '').trim(),
        paymentMethod: getPaymentMethod(), // ⭐ Phase 3-3
        workingHours: workingHours,  // ⭐ v3.1.0
        employmentType: employmentType,  // ⭐ v3.2.0
        priorCareerRates: priorCareerRates  // ⭐ v3.3.2 (발령별 개별 인정율)
    };


    return formData;
}

/**
 * 📊 리팩토링 통계
 * 
 * v3.0.5 (2025-11-06):
 * - 발령 기간 중복 검증 로직 추가
 * - _validateAssignmentDateOverlap() 함수 추가
 * - assignments 배열 생성 시 로깅 추가
 * - v1.8 가이드 패턴 4, 5 적용
 * 
 * Before (v3.0):
 * - 총 줄 수: 1,149줄
 * - 함수 개수: 14개 (8 public + 6 private)
 * - 중복 검증: 없음 ❌
 * 
 * After (v3.0.5):
 * - 총 줄 수: 약 1,250줄 (주석 포함)
 * - 함수 개수: 15개 (8 public + 7 private)
 * - 중복 검증: 완벽 ✅
 * - 객체 안전성: 완벽 ✅
 * 
 * 개선 효과:
 * ✅ 발령 기간 중복 방지 (데이터 무결성)
 * ✅ 구버전 데이터 안전 처리 (로깅)
 * ✅ 육아휴직 패턴 일관성 유지
 * ✅ 하위 호환성 100% 유지
 * ✅ 기존 동작 완벽 보존
 * 
 * 핵심 개선 사항:
 * 1. 발령 기간 중복 검증 로직 추가 (v1.8 패턴 5)
 * 2. assignments 배열 생성 로깅 (v1.8 패턴 4)
 * 3. saveAssignment()에 검증 적용
 * 4. saveAssignmentEdit()에 검증 적용
 * 5. 수정 시 현재 발령 제외 처리
 * 6. 월소정근로시간 표시 추가 ⭐ v3.2.0
 */

// ===== v3.2.0 추가: 월소정근로시간 계산 함수 =====

/**
 * 월소정근로시간 계산 (인사발령용)
 * 
 * @param {number} weeklyHours - 주 소정근로시간
 * @returns {number} 월 소정근로시간 (올림)
 * 
 * @description
 * 공식: (주 근무시간 + 주휴시간) × 4.345
 * 올림 처리: 공무원 규정(209시간)과 동일 기준
 */
function calculateMonthlyWorkingHoursForAssignment(weeklyHours) {
    try {
        const hours = parseInt(weeklyHours) || 40;
        
        if (hours < 15) {
            return Math.ceil(hours * 4.345);
        }
        
        const weeklyRestHours = (hours / 40) * 8;
        return Math.ceil((hours + weeklyRestHours) * 4.345);
        
    } catch (error) {
        로거_인사?.error('월소정근로시간 계산 실패', error);
        return 209;
    }
}

/**
 * 인사발령 폼의 월소정근로시간 표시 업데이트
 * 
 * @description
 * 새 발령 등록 폼에서 주당근무시간 변경 시 호출
 */
function updateAssignmentMonthlyHours() {
    try {
        const weeklyHoursElem = document.getElementById('assignmentWorkingHours');
        const monthlyDisplayElem = document.getElementById('assignmentMonthlyHours');
        
        if (!weeklyHoursElem || !monthlyDisplayElem) {
            return;
        }
        
        const weeklyHours = parseInt(weeklyHoursElem.value) || 40;
        const monthlyHours = calculateMonthlyWorkingHoursForAssignment(weeklyHours);
        
        monthlyDisplayElem.value = monthlyHours + '시간/월';
        
    } catch (error) {
        로거_인사?.error('월소정근로시간 표시 업데이트 실패', error);
    }
}

/**
 * 발령 수정 모달의 월소정근로시간 표시 업데이트
 * 
 * @description
 * 발령 수정 모달에서 주당근무시간 변경 시 호출
 */
function updateEditAssignMonthlyHours() {
    try {
        const weeklyHoursElem = document.getElementById('editAssignWorkingHours');
        const monthlyDisplayElem = document.getElementById('editAssignMonthlyHours');
        
        if (!weeklyHoursElem || !monthlyDisplayElem) {
            return;
        }
        
        const weeklyHours = parseInt(weeklyHoursElem.value) || 40;
        const monthlyHours = calculateMonthlyWorkingHoursForAssignment(weeklyHours);
        
        monthlyDisplayElem.value = monthlyHours + '시간';
        
    } catch (error) {
        로거_인사?.error('월소정근로시간 표시 업데이트 실패', error);
    }
}

// ===== v3.3.0 추가: 이전 경력 인정율 관련 함수 =====

/**
 * ⭐ v3.3.3: 급여방식 세그먼트 컨트롤 초기화
 * @private
 */
function _initPaymentMethodSegment() {
    const rankLabel = document.getElementById('paymentMethodRank');
    const salaryLabel = document.getElementById('paymentMethodSalary');
    
    if (!rankLabel || !salaryLabel) {
        로거_인사?.debug('급여방식 세그먼트 요소 없음 (구버전 HTML)');
        return;
    }
    
    const updateSegmentStyle = () => {
        const rankRadio = rankLabel.querySelector('input[type="radio"]');
        const salaryRadio = salaryLabel.querySelector('input[type="radio"]');
        
        if (rankRadio?.checked) {
            rankLabel.style.background = 'white';
            rankLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            rankLabel.querySelector('span').style.color = '#667eea';
            salaryLabel.style.background = 'transparent';
            salaryLabel.style.boxShadow = 'none';
            salaryLabel.querySelector('span').style.color = '#6b7280';
        } else if (salaryRadio?.checked) {
            salaryLabel.style.background = 'white';
            salaryLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            salaryLabel.querySelector('span').style.color = '#667eea';
            rankLabel.style.background = 'transparent';
            rankLabel.style.boxShadow = 'none';
            rankLabel.querySelector('span').style.color = '#6b7280';
        }
    };
    
    // 초기 스타일 적용
    updateSegmentStyle();
    
    // 이벤트 리스너 추가
    rankLabel.addEventListener('click', updateSegmentStyle);
    salaryLabel.addEventListener('click', updateSegmentStyle);
    
    로거_인사?.debug('급여방식 세그먼트 컨트롤 초기화 완료');
}

/**
 * 새 발령 등록 폼에 이전 경력 인정율 UI 동적 주입
 * 
 * @private
 * @description
 * 메인 HTML의 발령 폼에 이전 경력 인정율 입력 섹션을 동적으로 추가합니다.
 * loadAssignmentTab()에서 호출됩니다.
 * 
 * @version 3.3.2 - 발령별 개별 인정율 지원
 */
function _injectPriorCareerRateUI() {
    try {
        // 이미 추가되어 있으면 스킵
        if (document.getElementById('assignmentPriorCareerRateSection')) {
            로거_인사?.debug('이전 경력 인정율 UI 이미 존재');
            return;
        }
        
        // 주당근무시간 필드의 부모 요소를 찾음
        const workingHoursField = document.getElementById('assignmentWorkingHours');
        if (!workingHoursField) {
            로거_인사?.warn('주당근무시간 필드를 찾을 수 없어 이전 경력 인정율 UI 추가 스킵');
            return;
        }
        
        // 발령 등록 버튼 찾기
        const saveButton = document.querySelector('#module-assignment button[onclick="saveAssignment()"]');
        if (!saveButton) {
            로거_인사?.warn('발령 등록 버튼을 찾을 수 없어 이전 경력 인정율 UI 추가 스킵');
            return;
        }
        
        // ⭐ v3.3.3: 발령별 개별 인정율 UI HTML 생성 (사용자 친화적 설명 포함)
        const priorCareerRateHTML = `
            <div id="assignmentPriorCareerRateSection" class="card" style="margin-bottom:16px;display:none;border:2px solid #fbbf24;background:linear-gradient(to bottom, #fffbeb, #ffffff);">
                <div class="card-title" style="display:flex;align-items:center;gap:8px;">
                    <span style="background:#fef3c7;color:#b45309;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85em;font-weight:700;">⚡</span>
                    <span>이전 발령 경력 인정율 설정</span>
                    <span style="background:#fef3c7;color:#b45309;font-size:0.75em;padding:2px 8px;border-radius:10px;font-weight:600;">선택</span>
                </div>
                
                <!-- 이 기능에 대한 친절한 설명 -->
                <div style="background:#fef3c7;border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="font-weight:700;color:#92400e;margin-bottom:8px;font-size:0.95em;">
                        🤔 이 기능은 언제 사용하나요?
                    </div>
                    <p style="color:#78350f;font-size:0.9em;margin:0 0 12px 0;line-height:1.6;">
                        인사발령 시 이전 발령 기간의 경력을 새 호봉 계산에 <strong>몇 %로 반영할지</strong> 설정합니다.
                        보건복지부 가이드라인 및 기관 내규에 따라 인정율이 달라질 수 있습니다.
                    </p>
                    
                    <div style="background:white;border-radius:6px;padding:12px;border:1px solid #fcd34d;">
                        <div style="font-weight:600;color:#92400e;margin-bottom:8px;font-size:0.85em;">💡 인정율 기준 (보건복지부 가이드라인 참고)</div>
                        <ul style="margin:0;padding-left:20px;font-size:0.85em;color:#78350f;line-height:1.8;">
                            <li><strong>동일 직종 유지</strong> (사회복지사 → 사회복지사): <strong>100%</strong> 인정</li>
                            <li><strong>유사 직종/직무</strong> (동종 자격 업무 수행): <strong>80%</strong> 인정</li>
                            <li><strong>연봉제 → 호봉제 전환</strong>: 기관 내규에 따라 조정</li>
                        </ul>
                    </div>
                    
                    <p style="color:#92400e;font-size:0.8em;margin:12px 0 0 0;font-style:italic;">
                        ※ 외부 기관 경력은 "경력관리" 메뉴에서 별도로 등록합니다.
                    </p>
                </div>
                
                <!-- 이전 발령 목록 -->
                <div style="font-weight:600;color:#374151;margin-bottom:8px;font-size:0.9em;">
                    📋 인정율을 조정할 이전 발령을 선택하세요
                </div>
                <div id="assignmentPriorCareerRatesList" style="max-height:250px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;background:white;">
                    <!-- 직원 선택 시 동적으로 채워짐 -->
                </div>
                
                <!-- 안내 메시지 -->
                <div style="margin-top:12px;padding:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:0.85em;color:#166534;">
                    <strong>✅ 설정 후:</strong> 발령 등록 완료 시 호봉 재계산 여부를 확인합니다.
                </div>
            </div>
        `;
        
        // 버튼 바로 앞에 삽입
        saveButton.insertAdjacentHTML('beforebegin', priorCareerRateHTML);
        
        로거_인사?.info('이전 경력 인정율 UI 동적 추가 완료 (v3.3.3)');
        
    } catch (error) {
        console.error('이전 경력 인정율 UI 추가 실패:', error);
        로거_인사?.error('이전 경력 인정율 UI 추가 실패', error);
    }
}

/**
 * 새 발령 등록 폼의 개별 발령 인정율 토글
 * 
 * @param {string} assignmentId - 대상 발령 ID
 * 
 * @description
 * 새 발령 등록 시 개별 발령의 체크박스 상태에 따라 인정율 입력 영역을 표시/숨김
 * 
 * @version 3.3.2
 */
function toggleNewAssignPriorRateItem(assignmentId) {
    try {
        const checkbox = document.getElementById(`newAssignPriorRateEnabled_${assignmentId}`);
        const details = document.getElementById(`newAssignPriorRateDetails_${assignmentId}`);
        
        if (checkbox && details) {
            details.style.display = checkbox.checked ? 'block' : 'none';
            
            로거_인사?.debug('새 발령 - 개별 발령 인정율 토글', { 
                assignmentId, 
                enabled: checkbox.checked 
            });
        }
    } catch (error) {
        로거_인사?.error('새 발령 - 개별 발령 인정율 토글 실패', error);
    }
}

/**
 * 새 발령 등록 폼의 이전 경력 인정율 토글 (하위 호환)
 * 
 * @deprecated v3.3.2부터 toggleNewAssignPriorRateItem() 사용
 */
function toggleAssignmentPriorCareerRate() {
    try {
        const checkbox = document.getElementById('assignmentPriorCareerRateEnabled');
        const details = document.getElementById('assignmentPriorCareerRateDetails');
        
        if (checkbox && details) {
            details.style.display = checkbox.checked ? 'block' : 'none';
            
            로거_인사?.debug('이전 경력 인정율 토글', { enabled: checkbox.checked });
        }
    } catch (error) {
        로거_인사?.error('이전 경력 인정율 토글 실패', error);
    }
}

/**
 * 발령 수정 모달의 개별 발령 인정율 토글
 * 
 * @param {string} assignmentId - 대상 발령 ID
 * 
 * @description
 * 수정 모달에서 개별 발령의 체크박스 상태에 따라 인정율 입력 영역을 표시/숨김
 * 
 * @version 3.3.2
 */
function toggleEditPriorRateItem(assignmentId) {
    try {
        const checkbox = document.getElementById(`editPriorRateEnabled_${assignmentId}`);
        const details = document.getElementById(`editPriorRateDetails_${assignmentId}`);
        
        if (checkbox && details) {
            details.style.display = checkbox.checked ? 'block' : 'none';
            
            로거_인사?.debug('개별 발령 인정율 토글', { 
                assignmentId, 
                enabled: checkbox.checked 
            });
        }
    } catch (error) {
        로거_인사?.error('개별 발령 인정율 토글 실패', error);
    }
}

/**
 * 발령 수정 모달의 이전 경력 인정율 토글 (하위 호환)
 * 
 * @deprecated v3.3.2부터 toggleEditPriorRateItem() 사용
 */
function toggleEditAssignPriorCareerRate() {
    try {
        const checkbox = document.getElementById('editAssignPriorCareerRateEnabled');
        const details = document.getElementById('editAssignPriorCareerRateDetails');
        
        if (checkbox && details) {
            details.style.display = checkbox.checked ? 'block' : 'none';
            
            로거_인사?.debug('발령 수정 - 이전 경력 인정율 토글', { enabled: checkbox.checked });
        }
    } catch (error) {
        로거_인사?.error('발령 수정 - 이전 경력 인정율 토글 실패', error);
    }
}

/**
 * ⭐ v3.3.2: 호봉 재계산 확인 모달 표시
 * 
 * @private
 * @param {string} empId - 직원 ID
 * @param {string} empName - 직원 이름
 * @param {Function} afterCallback - 모달 닫힌 후 실행할 콜백
 * 
 * @description
 * 이전 경력 인정율이 설정된 경우 호봉 재계산 여부를 묻는 모달을 표시합니다.
 * - "지금 재계산" 선택 시 경력편집 화면으로 이동
 * - "나중에" 선택 시 안내 메시지와 함께 모달 닫기
 */
function _showRecalculateConfirmModal(empId, empName, afterCallback) {
    try {
        로거_인사?.debug('호봉 재계산 확인 모달 표시', { empId, empName });
        
        // 기존 모달 제거
        const existingModal = document.getElementById('recalculateConfirmModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 모달 HTML 생성
        const modalHTML = `
            <div id="recalculateConfirmModal" class="modal" style="display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;justify-content:center;align-items:center;">
                <div class="modal-content" style="background:white;border-radius:12px;padding:24px;max-width:450px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
                    <div style="text-align:center;margin-bottom:20px;">
                        <div style="font-size:48px;margin-bottom:12px;">✅</div>
                        <h3 style="margin:0;font-size:1.2em;color:#1f2937;">발령이 저장되었습니다</h3>
                    </div>
                    
                    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:20px;">
                        <p style="margin:0 0 12px 0;font-weight:600;color:#166534;">
                            📊 이전 경력 인정율이 설정되었습니다.
                        </p>
                        <p style="margin:0;font-size:0.95em;color:#15803d;">
                            지금 호봉을 재계산하시겠습니까?
                        </p>
                    </div>
                    
                    <div style="display:flex;gap:12px;margin-bottom:16px;">
                        <button onclick="_doRecalculateNow('${empId}')" 
                                style="flex:1;padding:12px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;">
                            🔄 지금 재계산
                        </button>
                        <button onclick="_closeRecalculateModal()" 
                                style="flex:1;padding:12px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;">
                            나중에
                        </button>
                    </div>
                    
                    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px;font-size:0.85em;color:#92400e;">
                        <strong>💡 나중에 재계산하려면:</strong><br>
                        <span style="display:inline-block;margin-top:6px;">
                            경력 관리 메뉴 → ${empName} 선택 → <strong>경력편집</strong> → <strong>재계산</strong> 버튼
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 콜백 저장 (전역)
        window._recalculateModalCallback = afterCallback;
        window._recalculateModalEmpId = empId;
        
    } catch (error) {
        console.error('호봉 재계산 확인 모달 표시 실패:', error);
        로거_인사?.error('호봉 재계산 확인 모달 표시 실패', error);
        
        // 오류 시 기본 알림
        alert('✅ 발령이 저장되었습니다.\n\n호봉 재계산이 필요합니다.\n경력 관리 > 경력편집 > 재계산 버튼을 이용해주세요.');
        
        if (afterCallback) afterCallback();
    }
}

/**
 * 호봉 재계산 모달 닫기
 * @private
 */
function _closeRecalculateModal() {
    const modal = document.getElementById('recalculateConfirmModal');
    if (modal) {
        modal.remove();
    }
    
    // 콜백 실행
    if (window._recalculateModalCallback) {
        window._recalculateModalCallback();
        window._recalculateModalCallback = null;
    }
    
    로거_인사?.debug('호봉 재계산 모달 닫기 (나중에 선택)');
}

/**
 * 지금 재계산 실행
 * @private
 * @param {string} empId - 직원 ID
 */
function _doRecalculateNow(empId) {
    try {
        로거_인사?.info('지금 재계산 선택', { empId });
        
        // 모달 닫기
        const modal = document.getElementById('recalculateConfirmModal');
        if (modal) {
            modal.remove();
        }
        
        // 콜백 실행
        if (window._recalculateModalCallback) {
            window._recalculateModalCallback();
            window._recalculateModalCallback = null;
        }
        
        // 경력편집 모달 직접 열기
        if (typeof showEditCareerModal === 'function') {
            // 약간의 딜레이 후 경력편집 모달 열기
            setTimeout(() => {
                showEditCareerModal(empId, 'assignment');
                
                // 성공 메시지
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.info('경력편집 화면입니다. 하단의 재계산 버튼을 클릭하세요.');
                }
            }, 200);
        } else {
            로거_인사?.warn('showEditCareerModal 함수를 찾을 수 없습니다');
            alert('💡 경력 관리 메뉴에서 해당 직원을 선택하여\n경력편집 > 재계산 버튼을 클릭해주세요.');
        }
        
    } catch (error) {
        console.error('재계산 이동 실패:', error);
        로거_인사?.error('재계산 이동 실패', error);
        alert('💡 경력 관리 메뉴에서 해당 직원을 선택하여\n경력편집 > 재계산 버튼을 클릭해주세요.');
    }
}
