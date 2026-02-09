/**
 * 급여설정_인사.js - 급여 설정 관리
 * 
 * 급여 관련 기초 데이터 설정
 * - 직급 관리 (호봉제/연봉제)
 * - 급여표 관리 (연도별)
 * - 직책수당 설정 (연도별)
 * - 명절휴가비 설정 (연도별)
 * - 통상임금 설정 (포함 항목 선택, 명절휴가비 산입 방식)
 * - 수당 계산 설정 (월소정근로시간 소수점, 시급 절사, 시간외수당 절사)
 * 
 * @version 3.3.1
 * @since 2025-12-01
 * @location js/labor/급여설정_인사.js
 * 
 * [변경 이력]
 * v3.3.1 - 연도 선택 범위 확대 (2026-01-27)
 * - showYearSelectModal 연도 범위: ±5년 → -5년~+30년
 * - 2050년까지 선택 가능
 * v3.3.0 - Electron 호환 모달 적용 (2026-01-27)
 * - prompt() → 사용자 친화적 모달로 전면 교체
 * - 연도 선택: 드롭다운 모달 (showYearSelectModal)
 * - 텍스트 입력: 입력 모달 (showTextInputModal)
 * - 삭제 확인: 체크박스 모달 (showDeleteConfirmModal)
 * - 선택: 버튼 선택 모달 (showSelectModal)
 * - Electron 환경 prompt() 미지원 문제 해결
 * v3.2.0 - 시급 절사 적용 시점 옵션 추가 (2026-01-07)
 * - 수당 계산 설정에 "절사 적용 시점" 옵션 추가
 * - '배율 적용 후 절사' (after): 원시급 × 배율 → 절사 (기본값)
 * - '배율 적용 전 절사' (before): 원시급 → 절사 → × 배율
 * - hourlyWageRounding.applyTiming 설정 저장/로드
 * v3.1.0 - 명절휴가비 산입 방식 선택 기능 추가 (2025-12-11)
 * - 통상임금 탭에 명절휴가비 산입 방식 선택 추가
 * - 연간 고정: (설 기본급×비율 + 추석 기본급×비율) ÷ 12 (매월 동일)
 * - 월별 연동: 해당 월 기본급 × (비율 합계 ÷ 12) (호봉 변동 시 연동)
 * - holidayBonusMethod 설정 저장/로드 ('annual' | 'monthly')
 * - toggleHolidayBonusMethod(), updateMethodSelection() 함수 추가
 * v3.0.0 - 시급 절사 방식 설정 추가 (2025-12-08)
 * - 수당 계산 설정 탭에 시급 절사 방식 옵션 추가
 * - 소수점 유지 / 정수 처리 선택 가능
 * - 정수 처리 시 단위(1원/10원), 방식(버림/반올림/올림) 선택
 * - hourlyWageRounding 설정 저장/로드
 * - 기관별 다양한 시급 계산 방식 지원
 * v2.9.0 - 수당 계산 설정 탭 추가 (2025-12-05)
 * - 새 탭 "수당 계산 설정" 추가
 * - 월소정근로시간 소수점 처리 → 수당 계산 설정 탭으로 이동
 * - 시간외수당 절사 방식 설정 추가 (1원/10원, 올림/반올림/버림)
 * - 연도별 관리, 전년도 복사 기능 지원
 * v2.8.0 - 월소정근로시간 소수점 처리 설정 (2025-12-05)
 * - 통상임금 설정 탭에 소수점 처리 방식 옵션 추가
 * - 올림/반올림/버림 선택 가능 (기본값: 반올림)
 * - 고용노동부 질의답변 기준 반영 (노사합의, 근로자 불이익 금지)
 * - SalaryCalculator.getMonthlyWorkingHours()에서 설정값 참조
 * v2.7.2 - 직책수당 저장 버그 수정 (2025-12-02)
 * - savePositionAllowances() 셀렉터 수정 (.pa-item-input)
 * v2.7.1 - 직책수당 직위 필터링 개선 (2025-12-02)
 * - 해당 연도에 하루라도 재직한 직원의 직위만 표시
 * - 조직도 설정(hr_org_chart_settings) 순서대로 정렬
 * - getPositionsForYear(year) 메서드 추가
 * v2.7.0 - 직책수당 UI 전면 개선 (2025-12-02)
 * - 모든 직위 자동 표시 → 추가 방식으로 변경
 * - 직책수당 설정된 직위만 목록에 표시
 * - 직위 선택 드롭다운 + 직접 입력 지원
 * - 직책수당 삭제 기능 추가
 * v2.6.1 - db 호환성 수정 (2025-12-02)
 * - getPositionList()에서 db.getAll() → db.data.employees 호환
 * v2.6.0 - 명절휴가비 설정 UI 개선 (2025-12-02)
 * - 연도 선택 영역 확대 및 디자인 개선
 * - 설/추석 카드 디자인 전면 개편 (그라데이션 헤더, 아이콘)
 * - 통상임금 산입 안내 섹션 개선
 * - 전체 레이아웃 정리
 * v2.5.0 - 통상임금 설정 탭 구현 (2025-12-02)
 * - 급여 기본 설정 탭 제거 (목적에 맞지 않음)
 * - 통상임금 포함 항목 설정 (명절휴가비, 직책수당, 직무대리)
 * - 명절휴가비: 1년 만근 가정 (중도입사자도 전액 포함)
 * - 직책수당: 중도입사자 월할 계산 (실제 근무 개월수/12)
 * - 직무대리: 해당 월 기간 존재 시 전액 포함
 * - localStorage 키: hr_ordinary_wage_settings
 * v2.4.0 - 급여 기본 설정 탭 추가 (2025-12-02)
 * - 급여 기준일 설정 (1~31일)
 * - 직무대리 직책수당 지급 여부 설정
 * - 연도별 설정 관리
 * v2.3.0 - 직책수당 UI 개선 (2025-12-02)
 * - 연도 선택 영역 디자인 개선
 * - 직위 목록 카드 스타일 적용
 * - 입력 필드 및 버튼 간격 조정
 * - 전체적인 여백 및 가독성 향상
 * v2.2.0 - 직책수당 직위 추가 버그 수정 (2025-12-02)
 * - getPositionList()가 직책수당 데이터에서도 직위 로드하도록 수정
 * - 수동 추가한 직위가 UI에 표시되지 않던 버그 해결
 * v2.1.0 - 연봉제 정액 명절휴가비 설/추석 분리 (2025-12-02)
 * - 연봉제 급여표: 설 명절휴가비, 추석 명절휴가비 각각 입력
 * - 기존 holidayBonus 데이터 자동 마이그레이션
 * v2.0.0 - 급여표 엑셀 형식 변경 (2025-12-02)
 * - 엑셀 다운로드/업로드: 직급=열, 호봉=행 (시스템 UI와 동일)
 * - 연도 삭제 기능 추가
 * - 일괄 삭제 시 "삭제" 텍스트 입력 확인
 * - 연도 선택 목록: 실제 데이터가 있는 연도만 표시
 * v1.8.0 - 직급 불러오기 연도 필터링 (2025-12-02)
 * - 선택된 연도에 근무한 직원의 직급만 추출
 * - 과거/현재 직급 구분하여 연도별 관리 가능
 * v1.7.0 - 직급 연도별 관리 기능 추가 (2025-12-02)
 * - 연도 선택 드롭다운 추가
 * - 새 연도 생성 기능
 * - 전년도 복사 기능
 * - 기존 v1.0 데이터 자동 마이그레이션
 * v1.6.0 - 직급 일괄 삭제 기능 추가 (2025-12-02)
 * - 호봉제 전체 삭제
 * - 연봉제 전체 삭제
 * - 모든 직급 삭제
 * v1.5.0 - UI 개선 (2025-12-02)
 * - 직급 관리: 드래그 앤 드롭으로 순서 변경 기능 추가
 * - 호봉제 급여표: 행/열 전환 (호봉=행, 직급=열)
 * v1.4.0 - 기존 데이터에서 직급 불러오기 기능 추가 (2025-12-02)
 * - 직원 발령 정보에서 직급 자동 추출
 * - 호봉제/연봉제 자동 분류
 * - 중복 직급 건너뛰기
 * v1.3.0 - Phase 1-4: 명절휴가비 설정 기능 추가
 * - 연도별 설/추석 날짜 설정
 * - 지급 비율 설정 (기본 60%)
 * - 통상임금 산입 기준 안내
 * v1.2.0 - Phase 1-3: 직책수당 설정 기능 추가
 * - 직위별 직책수당 설정 UI
 * - 연도별 관리
 * - 전년도 복사 기능
 * - 시스템 직위 자동 인식
 * - 새 직위 추가 기능
 * v1.1.0 - Phase 1-2: 급여표 관리 기능 추가
 * - 연도별 급여표 CRUD
 * - 호봉제 급여표 테이블 UI
 * - 연봉제 급여표 테이블 UI
 * - 전년도 복사 기능
 * - 엑셀 업로드/다운로드
 * - 최대 호봉 설정
 * v1.0.0 - Phase 1-1: 직급 관리 기능
 * - 호봉제/연봉제 직급 CRUD
 * - 직급 순서 변경
 * 
 * [데이터 저장소]
 * - hr_salary_grades: 직급 목록 (호봉제/연봉제)
 * - hr_salary_tables: 급여표 (연도별)
 * - hr_position_allowances: 직책수당 (연도별)
 * - hr_salary_settings: 급여 설정 (연도별 최대호봉, 명절휴가비 등)
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG)
 * - 데이터베이스_인사.js (db)
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - XLSX (SheetJS) - 엑셀 처리
 */

// ===== Electron 호환 모달 유틸리티 (v3.3.0) =====

/**
 * 연도 선택 모달 표시
 * @param {number} defaultYear - 기본 선택 연도
 * @param {string} title - 모달 제목
 * @returns {Promise<number|null>} 선택된 연도 또는 null (취소)
 */
function showYearSelectModal(defaultYear, title = '연도 선택') {
    return new Promise((resolve) => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear - 5; y <= currentYear + 30; y++) {
            years.push(y);
        }
        
        const modalHtml = `
            <div id="yearSelectModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 24px;
                    min-width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${title}</h3>
                    <select id="yearSelectInput" style="
                        width: 100%; padding: 12px; font-size: 16px;
                        border: 2px solid #ddd; border-radius: 8px;
                        margin-bottom: 20px; cursor: pointer;
                    ">
                        ${years.map(y => `<option value="${y}" ${y === defaultYear ? 'selected' : ''}>${y}년</option>`).join('')}
                    </select>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="yearSelectCancel" style="
                            padding: 10px 20px; border: 1px solid #ddd;
                            background: white; border-radius: 6px; cursor: pointer;
                        ">취소</button>
                        <button id="yearSelectConfirm" style="
                            padding: 10px 20px; border: none;
                            background: linear-gradient(135deg, #4f46e5 0%, #764ba2 100%);
                            color: white; border-radius: 6px; cursor: pointer;
                        ">확인</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('yearSelectModal');
        const input = document.getElementById('yearSelectInput');
        
        document.getElementById('yearSelectConfirm').onclick = () => {
            const value = parseInt(input.value);
            modal.remove();
            resolve(value);
        };
        
        document.getElementById('yearSelectCancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
        
 // ESC 키로 닫기
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(null);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

/**
 * 텍스트 입력 모달 표시
 * @param {string} title - 모달 제목
 * @param {string} message - 안내 메시지
 * @param {string} defaultValue - 기본값
 * @returns {Promise<string|null>} 입력된 텍스트 또는 null (취소)
 */
function showTextInputModal(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="textInputModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 24px;
                    min-width: 360px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 12px 0; color: #333; font-size: 18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${title}</h3>
                    <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">${message}</p>
                    <input type="text" id="textInputValue" value="${defaultValue}" style="
                        width: 100%; padding: 12px; font-size: 16px;
                        border: 2px solid #ddd; border-radius: 8px;
                        margin-bottom: 20px; box-sizing: border-box;
                    " />
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="textInputCancel" style="
                            padding: 10px 20px; border: 1px solid #ddd;
                            background: white; border-radius: 6px; cursor: pointer;
                        ">취소</button>
                        <button id="textInputConfirm" style="
                            padding: 10px 20px; border: none;
                            background: linear-gradient(135deg, #4f46e5 0%, #764ba2 100%);
                            color: white; border-radius: 6px; cursor: pointer;
                        ">확인</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('textInputModal');
        const input = document.getElementById('textInputValue');
        input.focus();
        input.select();
        
        document.getElementById('textInputConfirm').onclick = () => {
            const value = input.value.trim();
            modal.remove();
            resolve(value || null);
        };
        
        document.getElementById('textInputCancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
        
 // Enter로 확인, ESC로 취소
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const value = input.value.trim();
                modal.remove();
                resolve(value || null);
            } else if (e.key === 'Escape') {
                modal.remove();
                resolve(null);
            }
        };
    });
}

/**
 * 삭제 확인 모달 (체크박스)
 * @param {string} title - 모달 제목
 * @param {string} message - 경고 메시지
 * @returns {Promise<boolean>} 확인 여부
 */
function showDeleteConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="deleteConfirmModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 24px;
                    min-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 16px 0; color: #dc3545; font-size: 18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${title}</h3>
                    <p style="margin: 0 0 20px 0; color: #333; font-size: 14px; line-height: 1.6; white-space: pre-line;">${message}</p>
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; cursor: pointer;">
                        <input type="checkbox" id="deleteConfirmCheck" style="width: 18px; height: 18px; cursor: pointer;" />
                        <span style="color: #666; font-size: 14px;">위 내용을 확인했으며, 삭제에 동의합니다.</span>
                    </label>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="deleteConfirmCancel" style="
                            padding: 10px 20px; border: 1px solid #ddd;
                            background: white; border-radius: 6px; cursor: pointer;
                        ">취소</button>
                        <button id="deleteConfirmOk" disabled style="
                            padding: 10px 20px; border: none;
                            background: #ccc; color: white; border-radius: 6px; cursor: not-allowed;
                        ">삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('deleteConfirmModal');
        const checkbox = document.getElementById('deleteConfirmCheck');
        const okBtn = document.getElementById('deleteConfirmOk');
        
        checkbox.onchange = () => {
            if (checkbox.checked) {
                okBtn.disabled = false;
                okBtn.style.background = '#dc3545';
                okBtn.style.cursor = 'pointer';
            } else {
                okBtn.disabled = true;
                okBtn.style.background = '#ccc';
                okBtn.style.cursor = 'not-allowed';
            }
        };
        
        okBtn.onclick = () => {
            if (checkbox.checked) {
                modal.remove();
                resolve(true);
            }
        };
        
        document.getElementById('deleteConfirmCancel').onclick = () => {
            modal.remove();
            resolve(false);
        };
        
 // ESC로 닫기
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

/**
 * 선택 모달 (버튼식)
 * @param {string} title - 모달 제목
 * @param {Array<{value: string, label: string}>} options - 선택지 배열
 * @returns {Promise<string|null>} 선택된 값 또는 null (취소)
 */
function showSelectModal(title, options) {
    return new Promise((resolve) => {
        const buttonsHtml = options.map(opt => `
            <button class="selectModalBtn" data-value="${opt.value}" style="
                width: 100%; padding: 14px; margin-bottom: 10px;
                border: 2px solid #ddd; background: white;
                border-radius: 8px; cursor: pointer; font-size: 15px;
                transition: all 0.2s;
            ">${opt.label}</button>
        `).join('');
        
        const modalHtml = `
            <div id="selectModal" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); display: flex;
                align-items: center; justify-content: center; z-index: 10000;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 24px;
                    min-width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg> ${title}</h3>
                    ${buttonsHtml}
                    <button id="selectModalCancel" style="
                        width: 100%; padding: 12px; margin-top: 10px;
                        border: 1px solid #ddd; background: #f5f5f5;
                        border-radius: 8px; cursor: pointer; font-size: 14px;
                    ">취소</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('selectModal');
        
 // 선택 버튼 이벤트
        modal.querySelectorAll('.selectModalBtn').forEach(btn => {
            btn.onmouseover = () => {
                btn.style.borderColor = '#4f46e5';
                btn.style.background = '#f8f9ff';
            };
            btn.onmouseout = () => {
                btn.style.borderColor = '#ddd';
                btn.style.background = 'white';
            };
            btn.onclick = () => {
                modal.remove();
                resolve(btn.dataset.value);
            };
        });
        
        document.getElementById('selectModalCancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
        
 // ESC로 닫기
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
                resolve(null);
            }
        };
        document.addEventListener('keydown', escHandler);
    });
}

// ===== 상수 정의 =====

/**
 * 직급 데이터 저장소 키
 * @constant {string}
 */
const SALARY_GRADES_KEY = 'hr_salary_grades';

/**
 * 급여표 저장소 키
 * @constant {string}
 */
const SALARY_TABLES_KEY = 'hr_salary_tables';

/**
 * 직책수당 저장소 키
 * @constant {string}
 */
const POSITION_ALLOWANCES_KEY = 'hr_position_allowances';

/**
 * 급여 설정 저장소 키
 * @constant {string}
 */
const SALARY_SETTINGS_KEY = 'hr_salary_settings';

/**
 * 명절휴가비 유형
 * @constant {Object}
 */
const HOLIDAY_BONUS_TYPES = Object.freeze({
    PERCENT: 'percent',    // 기본급 × 비율
    FIXED: 'fixed'         // 정액
});

/**
 * 탭 정의
 * @constant {Object}
 */
const SALARY_TABS = Object.freeze({
    GRADES: 'grades',           // 직급 관리
    TABLES: 'tables',           // 급여표 관리
    POSITION: 'position',       // 직책수당 설정
    HOLIDAY: 'holiday',         // 명절휴가비 설정
    ORDINARY: 'ordinary',       // 통상임금 설정
    CALCULATION: 'calculation'  // 수당 계산 설정
});

// ===== 데이터 관리 =====

/**
 * 급여 설정 데이터 관리자
 * @namespace SalarySettingsManager
 */
const SalarySettingsManager = {
 /**
 * 직급 데이터 로드 (현재 선택된 연도)
 * @returns {Object} 직급 데이터 { rankGrades: [], salaryGrades: [] }
 */
    loadGrades() {
        return this.loadGradesByYear(currentGradeYear);
    },
    
 /**
 * 특정 연도의 직급 데이터 로드
 * @param {number|string} year - 연도
 * @returns {Object} 직급 데이터
 */
    loadGradesByYear(year) {
        try {
            const allData = this._loadAllGradesData();
            const yearStr = String(year);
            
            if (allData.years && allData.years[yearStr]) {
                return {
                    rankGrades: allData.years[yearStr].rankGrades || [],
                    salaryGrades: allData.years[yearStr].salaryGrades || []
                };
            }
        } catch (e) {
            로거_인사?.error('직급 데이터 로드 실패', e);
        }
        
 // 기본 구조 반환
        return {
            rankGrades: [],
            salaryGrades: []
        };
    },
    
 /**
 * 직급 데이터 저장 (현재 선택된 연도)
 * @param {Object} data - 직급 데이터
 */
    saveGrades(data) {
        this.saveGradesByYear(currentGradeYear, data);
    },
    
 /**
 * 특정 연도의 직급 데이터 저장
 * @param {number|string} year - 연도
 * @param {Object} data - 직급 데이터
 */
    saveGradesByYear(year, data) {
        try {
            const allData = this._loadAllGradesData();
            const yearStr = String(year);
            
            if (!allData.years) {
                allData.years = {};
            }
            
            allData.years[yearStr] = {
                rankGrades: data.rankGrades || [],
                salaryGrades: data.salaryGrades || []
            };
            
            allData.metadata = allData.metadata || {};
            allData.metadata.lastUpdated = new Date().toISOString();
            allData.metadata.version = '2.0';
            
            localStorage.setItem(SALARY_GRADES_KEY, JSON.stringify(allData));
            로거_인사?.info('직급 데이터 저장 완료', { year: yearStr });
        } catch (e) {
            로거_인사?.error('직급 데이터 저장 실패', e);
            throw e;
        }
    },
    
 /**
 * 전체 직급 데이터 로드 (내부용)
 * @private
 * @returns {Object} 전체 데이터
 */
    _loadAllGradesData() {
        try {
            const raw = localStorage.getItem(SALARY_GRADES_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                
 // v1.0 구조 마이그레이션 (단일 → 연도별)
                if (data.rankGrades && !data.years) {
                    로거_인사?.info('직급 데이터 v1.0 → v2.0 마이그레이션');
                    const currentYear = new Date().getFullYear();
                    return {
                        years: {
                            [currentYear]: {
                                rankGrades: data.rankGrades || [],
                                salaryGrades: data.salaryGrades || []
                            }
                        },
                        metadata: {
                            lastUpdated: new Date().toISOString(),
                            version: '2.0',
                            migratedFrom: '1.0'
                        }
                    };
                }
                
                return data;
            }
        } catch (e) {
            로거_인사?.error('전체 직급 데이터 로드 실패', e);
        }
        
        return {
            years: {},
            metadata: { version: '2.0' }
        };
    },
    
 /**
 * 저장된 연도 목록 반환
 * @returns {number[]} 연도 목록 (내림차순)
 */
    getGradeYears() {
        try {
            const allData = this._loadAllGradesData();
            if (allData.years) {
                return Object.keys(allData.years)
                    .map(y => parseInt(y))
                    .sort((a, b) => b - a); // 내림차순
            }
        } catch (e) {
            로거_인사?.error('직급 연도 목록 조회 실패', e);
        }
        return [];
    },
    
 /**
 * 새 연도 생성
 * @param {number} year - 연도
 * @returns {boolean} 성공 여부
 */
    createGradeYear(year) {
        const yearStr = String(year);
        const allData = this._loadAllGradesData();
        
        if (allData.years && allData.years[yearStr]) {
            throw new Error(`${year}년 직급 데이터가 이미 존재합니다.`);
        }
        
        if (!allData.years) {
            allData.years = {};
        }
        
        allData.years[yearStr] = {
            rankGrades: [],
            salaryGrades: []
        };
        
        allData.metadata = allData.metadata || {};
        allData.metadata.lastUpdated = new Date().toISOString();
        
        localStorage.setItem(SALARY_GRADES_KEY, JSON.stringify(allData));
        로거_인사?.info('새 직급 연도 생성', { year });
        return true;
    },
    
 /**
 * 전년도 직급 복사
 * @param {number} sourceYear - 원본 연도
 * @param {number} targetYear - 대상 연도
 * @returns {Object} 복사된 데이터 정보
 */
    copyGradesFromYear(sourceYear, targetYear) {
        const sourceData = this.loadGradesByYear(sourceYear);
        
        if (sourceData.rankGrades.length === 0 && sourceData.salaryGrades.length === 0) {
            throw new Error(`${sourceYear}년 직급 데이터가 없습니다.`);
        }
        
 // ID 재생성하여 복사
        const newRankGrades = sourceData.rankGrades.map((g, i) => ({
            ...g,
            id: `RG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
            createdAt: new Date().toISOString(),
            copiedFrom: { year: sourceYear, originalId: g.id }
        }));
        
        const newSalaryGrades = sourceData.salaryGrades.map((g, i) => ({
            ...g,
            id: `SG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${i}`,
            createdAt: new Date().toISOString(),
            copiedFrom: { year: sourceYear, originalId: g.id }
        }));
        
        this.saveGradesByYear(targetYear, {
            rankGrades: newRankGrades,
            salaryGrades: newSalaryGrades
        });
        
        로거_인사?.info('직급 전년도 복사', { sourceYear, targetYear, 
            rankCount: newRankGrades.length, 
            salaryCount: newSalaryGrades.length 
        });
        
        return {
            rankCount: newRankGrades.length,
            salaryCount: newSalaryGrades.length
        };
    },
    
 /**
 * 특정 연도의 직급 데이터 삭제
 * @param {number|string} year - 삭제할 연도
 */
    deleteGradeYear(year) {
        const yearStr = String(year);
        const allData = this._loadAllGradesData();
        
        if (!allData.years || !allData.years[yearStr]) {
            throw new Error(`${year}년 직급 데이터가 없습니다.`);
        }
        
 // 마지막 연도 삭제 방지
        const yearCount = Object.keys(allData.years).length;
        if (yearCount <= 1) {
            throw new Error('마지막 연도는 삭제할 수 없습니다.');
        }
        
 // 삭제
        delete allData.years[yearStr];
        
        allData.metadata = allData.metadata || {};
        allData.metadata.lastUpdated = new Date().toISOString();
        
        localStorage.setItem(SALARY_GRADES_KEY, JSON.stringify(allData));
        로거_인사?.info('직급 연도 삭제', { year });
    },
    
 /**
 * 급여 설정 로드
 * @returns {Object} 급여 설정
 */
    loadSettings() {
        try {
            const data = localStorage.getItem(SALARY_SETTINGS_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            로거_인사?.error('급여 설정 로드 실패', e);
        }
        return {};
    },
    
 /**
 * 급여 설정 저장
 * @param {Object} data - 급여 설정
 */
    saveSettings(data) {
        try {
            localStorage.setItem(SALARY_SETTINGS_KEY, JSON.stringify(data));
            로거_인사?.info('급여 설정 저장 완료');
        } catch (e) {
            로거_인사?.error('급여 설정 저장 실패', e);
            throw e;
        }
    },
    
 /**
 * 급여표 데이터 로드
 * @returns {Object} 급여표 데이터
 */
    loadSalaryTables() {
        try {
            const data = localStorage.getItem(SALARY_TABLES_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            로거_인사?.error('급여표 데이터 로드 실패', e);
        }
        return {};
    },
    
 /**
 * 급여표 데이터 저장
 * @param {Object} data - 급여표 데이터
 */
    saveSalaryTables(data) {
        try {
            localStorage.setItem(SALARY_TABLES_KEY, JSON.stringify(data));
            로거_인사?.info('급여표 데이터 저장 완료');
        } catch (e) {
            로거_인사?.error('급여표 데이터 저장 실패', e);
            throw e;
        }
    },
    
 /**
 * 특정 연도 급여표 가져오기
 * @param {number|string} year - 연도
 * @returns {Object} 해당 연도 급여표
 */
    getSalaryTableByYear(year) {
        const tables = this.loadSalaryTables();
        const yearTable = tables[String(year)] || {
            rank: {},      // 호봉제: { "직급명": { 1: 금액, 2: 금액, ... } }
            salary: {}     // 연봉제: { "직급명": { baseSalary: 금액, seolBonus?: 금액, chuseokBonus?: 금액 } }
        };
        
 // 기존 holidayBonus → seolBonus, chuseokBonus 마이그레이션
        if (yearTable.salary) {
            let migrated = false;
            Object.keys(yearTable.salary).forEach(gradeName => {
                const gradeData = yearTable.salary[gradeName];
                if (gradeData.holidayBonus && !gradeData.seolBonus && !gradeData.chuseokBonus) {
 // 기존 1회분 금액을 설/추석 동일하게 분배
                    gradeData.seolBonus = gradeData.holidayBonus;
                    gradeData.chuseokBonus = gradeData.holidayBonus;
                    delete gradeData.holidayBonus;
                    migrated = true;
                }
            });
            if (migrated) {
                로거_인사?.info('연봉제 명절휴가비 데이터 마이그레이션 (holidayBonus → seolBonus, chuseokBonus)', { year });
                this.saveSalaryTableByYear(year, yearTable);
            }
        }
        
        return yearTable;
    },
    
 /**
 * 특정 연도 급여표 저장
 * @param {number|string} year - 연도
 * @param {Object} yearData - 해당 연도 급여표
 */
    saveSalaryTableByYear(year, yearData) {
        const tables = this.loadSalaryTables();
        tables[String(year)] = yearData;
        this.saveSalaryTables(tables);
    },
    
 /**
 * 연도별 설정 가져오기
 * @param {number|string} year - 연도
 * @returns {Object} 해당 연도 설정
 */
    getSettingsByYear(year) {
        const settings = this.loadSettings();
        return settings[String(year)] || {
            maxRank: 31,    // 기본 최대 호봉
            holidayBonus: {
                "설": { holidayDate: "", rate: 0.6 },
                "추석": { holidayDate: "", rate: 0.6 }
            }
        };
    },
    
 /**
 * 연도별 설정 저장
 * @param {number|string} year - 연도
 * @param {Object} yearSettings - 해당 연도 설정
 */
    saveSettingsByYear(year, yearSettings) {
        const settings = this.loadSettings();
        settings[String(year)] = yearSettings;
        this.saveSettings(settings);
    },
    
 /**
 * 전년도 급여표 복사
 * @param {number|string} targetYear - 대상 연도
 * @returns {boolean} 복사 성공 여부
 */
    copyFromPreviousYear(targetYear) {
        const prevYear = Number(targetYear) - 1;
        const tables = this.loadSalaryTables();
        const settings = this.loadSettings();
        
        if (!tables[String(prevYear)]) {
            throw new Error(`${prevYear}년 급여표가 없습니다.`);
        }
        
 // 급여표 복사
        tables[String(targetYear)] = JSON.parse(JSON.stringify(tables[String(prevYear)]));
        this.saveSalaryTables(tables);
        
 // 설정 복사 (최대호봉 등, 명절 날짜는 제외)
        if (settings[String(prevYear)]) {
            const prevSettings = settings[String(prevYear)];
            settings[String(targetYear)] = {
                maxRank: prevSettings.maxRank || 31,
                holidayBonus: {
                    "설": { holidayDate: "", rate: prevSettings.holidayBonus?.["설"]?.rate || 0.6 },
                    "추석": { holidayDate: "", rate: prevSettings.holidayBonus?.["추석"]?.rate || 0.6 }
                }
            };
            this.saveSettings(settings);
        }
        
        로거_인사?.info('전년도 급여표 복사 완료', { from: prevYear, to: targetYear });
        return true;
    },
    
 /**
 * 등록된 급여표 연도 목록 가져오기
 * @returns {number[]} 연도 목록 (내림차순)
 */
    getAvailableYears() {
        const tables = this.loadSalaryTables();
        return Object.keys(tables).map(Number).sort((a, b) => b - a);
    },
    
 // ===== 직책수당 관리 =====
    
 /**
 * 직책수당 데이터 로드
 * @returns {Object} 직책수당 데이터
 */
    loadPositionAllowances() {
        try {
            const data = localStorage.getItem(POSITION_ALLOWANCES_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            로거_인사?.error('직책수당 데이터 로드 실패', e);
        }
        return {};
    },
    
 /**
 * 직책수당 데이터 저장
 * @param {Object} data - 직책수당 데이터
 */
    savePositionAllowances(data) {
        try {
            localStorage.setItem(POSITION_ALLOWANCES_KEY, JSON.stringify(data));
            로거_인사?.info('직책수당 데이터 저장 완료');
        } catch (e) {
            로거_인사?.error('직책수당 데이터 저장 실패', e);
            throw e;
        }
    },
    
 /**
 * 특정 연도 직책수당 가져오기
 * @param {number|string} year - 연도
 * @returns {Object} 해당 연도 직책수당 { "직위명": 금액, ... }
 */
    getPositionAllowancesByYear(year) {
        const allowances = this.loadPositionAllowances();
        return allowances[String(year)] || {};
    },
    
 /**
 * 특정 연도 직책수당 저장
 * @param {number|string} year - 연도
 * @param {Object} yearData - 해당 연도 직책수당
 */
    savePositionAllowancesByYear(year, yearData) {
        const allowances = this.loadPositionAllowances();
        allowances[String(year)] = yearData;
        this.savePositionAllowances(allowances);
    },
    
 /**
 * 직책수당 전년도 복사
 * @param {number|string} targetYear - 대상 연도
 * @returns {boolean} 복사 성공 여부
 */
    copyPositionAllowancesFromPrevYear(targetYear) {
        const prevYear = Number(targetYear) - 1;
        const allowances = this.loadPositionAllowances();
        
        if (!allowances[String(prevYear)]) {
            throw new Error(`${prevYear}년 직책수당 데이터가 없습니다.`);
        }
        
        allowances[String(targetYear)] = JSON.parse(JSON.stringify(allowances[String(prevYear)]));
        this.savePositionAllowances(allowances);
        
        로거_인사?.info('전년도 직책수당 복사 완료', { from: prevYear, to: targetYear });
        return true;
    },
    
 /**
 * 등록된 직책수당 연도 목록 가져오기
 * @returns {number[]} 연도 목록 (내림차순)
 */
    getPositionAllowanceYears() {
        const allowances = this.loadPositionAllowances();
        return Object.keys(allowances).map(Number).sort((a, b) => b - a);
    },
    
 /**
 * 직위 목록 가져오기 (조직 설정 또는 직원 데이터에서)
 * @returns {string[]} 직위 목록
 */
    getPositionList() {
        const positions = new Set();
        
 // 1. 조직 설정에서 직위 가져오기
        try {
            const orgSettings = localStorage.getItem('orgSettings');
            if (orgSettings) {
                const parsed = JSON.parse(orgSettings);
                if (parsed.positions && Array.isArray(parsed.positions)) {
                    parsed.positions.forEach(p => {
                        if (p && typeof p === 'string') {
                            positions.add(p);
                        } else if (p && p.name) {
                            positions.add(p.name);
                        }
                    });
                }
            }
        } catch (e) {
            로거_인사?.warn('조직 설정에서 직위 로드 실패', e);
        }
        
 // 2. 직원 데이터에서 사용 중인 직위 가져오기
        try {
 // db 호환성: data.employees 또는 getEmployees() 또는 getAll()
            let employees = [];
            if (typeof db !== 'undefined') {
                employees = db.data?.employees || db.getEmployees?.() || db.getAll?.() || [];
            }
            employees.forEach(emp => {
 // 현재 발령의 직위
                if (emp.currentPosition?.position) {
                    positions.add(emp.currentPosition.position);
                }
 // 발령 이력의 직위
                if (emp.assignments && Array.isArray(emp.assignments)) {
                    emp.assignments.forEach(assign => {
                        if (assign.position) {
                            positions.add(assign.position);
                        }
                    });
                }
            });
        } catch (e) {
            로거_인사?.warn('직원 데이터에서 직위 로드 실패', e);
        }
        
 // 3. 직책수당 데이터에서 직위 가져오기 (수동 추가된 직위 포함)
        try {
            const allowances = this.loadPositionAllowances();
            Object.keys(allowances).forEach(year => {
                const yearData = allowances[year];
                if (yearData && typeof yearData === 'object') {
                    Object.keys(yearData).forEach(position => {
                        if (position) {
                            positions.add(position);
                        }
                    });
                }
            });
        } catch (e) {
            로거_인사?.warn('직책수당 데이터에서 직위 로드 실패', e);
        }
        
        return Array.from(positions).sort();
    },
    
 /**
 * 특정 연도 재직자의 직위 목록 가져오기 (조직도 설정 순서대로 정렬)
 * @param {number|string} year - 연도
 * @returns {string[]} 직위 목록 (조직도 순서)
 */
    getPositionsForYear(year) {
        const yearStr = String(year);
        const yearStart = `${yearStr}-01-01`;
        const yearEnd = `${yearStr}-12-31`;
        const positions = new Set();
        
 // 1. 해당 연도에 재직한 직원의 직위 추출
        try {
            let employees = [];
            if (typeof db !== 'undefined') {
                employees = db.data?.employees || db.getEmployees?.() || db.getAll?.() || [];
            }
            
            employees.forEach(emp => {
                const entryDate = emp.employment?.entryDate;
                const retireDate = emp.employment?.retirementDate;
                
 // 해당 연도에 하루라도 재직했는지 확인
 // 입사일이 연도 끝 이전이고, 퇴사일이 없거나 연도 시작 이후
                if (entryDate && entryDate <= yearEnd && (!retireDate || retireDate >= yearStart)) {
 // 현재 직위
                    if (emp.currentPosition?.position) {
                        positions.add(emp.currentPosition.position);
                    }
                    
 // 발령 이력에서 해당 연도에 유효한 직위
                    if (emp.assignments && Array.isArray(emp.assignments)) {
                        emp.assignments.forEach(assign => {
                            if (assign.position) {
                                const assignStart = assign.startDate;
                                const assignEnd = assign.endDate;
                                
 // 발령 기간이 해당 연도와 겹치는지 확인
                                if (assignStart && assignStart <= yearEnd && 
                                    (!assignEnd || assignEnd >= yearStart)) {
                                    positions.add(assign.position);
                                }
                            }
                        });
                    }
                }
            });
        } catch (e) {
            로거_인사?.warn('직원 데이터에서 연도별 직위 로드 실패', e);
        }
        
 // 2. 조직도 설정에서 직위 순서 가져오기
        let positionOrder = [];
        try {
            const orgChartSettings = localStorage.getItem('hr_org_chart_settings');
            if (orgChartSettings) {
                const parsed = JSON.parse(orgChartSettings);
                if (parsed.positionSettings && Array.isArray(parsed.positionSettings)) {
 // order 순으로 정렬 후 name만 추출
                    positionOrder = parsed.positionSettings
                        .slice()
                        .sort((a, b) => (a.order || 999) - (b.order || 999))
                        .map(p => p.name);
                }
            }
        } catch (e) {
            로거_인사?.warn('조직도 설정에서 직위 순서 로드 실패', e);
        }
        
 // 3. 조직도 순서대로 정렬
        const positionArray = Array.from(positions);
        
 // 조직도에 있는 직위는 순서대로, 없는 직위는 마지막에 가나다순
        const sortedPositions = positionArray.sort((a, b) => {
            const orderA = positionOrder.indexOf(a);
            const orderB = positionOrder.indexOf(b);
            
 // 둘 다 조직도에 있으면 순서대로
            if (orderA !== -1 && orderB !== -1) {
                return orderA - orderB;
            }
 // 하나만 있으면 있는 것이 먼저
            if (orderA !== -1) return -1;
            if (orderB !== -1) return 1;
 // 둘 다 없으면 가나다순
            return a.localeCompare(b, 'ko');
        });
        
        return sortedPositions;
    },
    
 // ===== 통상임금 설정 관리 =====
    
 /**
 * 통상임금 설정 저장소 키
 * @constant {string}
 */
    ORDINARY_SETTINGS_KEY: 'hr_ordinary_wage_settings',
    
 /**
 * 통상임금 설정 로드
 * @returns {Object} 통상임금 설정 데이터
 */
    loadOrdinarySettings() {
        try {
            const data = localStorage.getItem(this.ORDINARY_SETTINGS_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            로거_인사?.error('통상임금 설정 로드 실패', e);
        }
        return {};
    },
    
 /**
 * 통상임금 설정 저장
 * @param {Object} data - 통상임금 설정 데이터
 */
    saveOrdinarySettings(data) {
        try {
            localStorage.setItem(this.ORDINARY_SETTINGS_KEY, JSON.stringify(data));
            로거_인사?.info('통상임금 설정 저장 완료');
        } catch (e) {
            로거_인사?.error('통상임금 설정 저장 실패', e);
        }
    },
    
 /**
 * 특정 연도 통상임금 설정 가져오기
 * @param {number|string} year - 연도
 * @returns {Object} 해당 연도 통상임금 설정
 */
    getOrdinarySettingsByYear(year) {
        const settings = this.loadOrdinarySettings();
        return settings[String(year)] || {
            includeHolidayBonus: true,        // 명절휴가비 포함 여부 (기본 true)
            includePositionAllowance: true,   // 직책수당 포함 여부 (기본 true)
            includeActingAllowance: true      // 직무대리 직책수당 포함 여부 (기본 true)
        };
    },
    
 /**
 * 특정 연도 통상임금 설정 저장
 * @param {number|string} year - 연도
 * @param {Object} yearSettings - 해당 연도 설정
 */
    saveOrdinarySettingsByYear(year, yearSettings) {
        const settings = this.loadOrdinarySettings();
        settings[String(year)] = yearSettings;
        this.saveOrdinarySettings(settings);
    },
    
 /**
 * 등록된 통상임금 설정 연도 목록 가져오기
 * @returns {number[]} 연도 목록
 */
    getOrdinarySettingsYears() {
        const settings = this.loadOrdinarySettings();
        return Object.keys(settings).map(Number).sort((a, b) => b - a);
    },
    
 /**
 * 호봉제 직급 추가
 * @param {string} name - 직급명
 * @returns {Object} 추가된 직급
 */
    addRankGrade(name) {
        const data = this.loadGrades();
        
 // 중복 체크
        if (data.rankGrades.some(g => g.name === name)) {
            throw new Error(`이미 존재하는 직급입니다: ${name}`);
        }
        
        const newGrade = {
            id: `RG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: name,
            order: data.rankGrades.length + 1,
            createdAt: new Date().toISOString()
        };
        
        data.rankGrades.push(newGrade);
        this.saveGrades(data);
        
        로거_인사?.info('호봉제 직급 추가', { name });
        return newGrade;
    },
    
 /**
 * 연봉제 직급 추가
 * @param {string} name - 직급명
 * @param {string} holidayBonusType - 명절휴가비 유형 (percent/fixed)
 * @returns {Object} 추가된 직급
 */
    addSalaryGrade(name, holidayBonusType = HOLIDAY_BONUS_TYPES.PERCENT) {
        const data = this.loadGrades();
        
 // 중복 체크
        if (data.salaryGrades.some(g => g.name === name)) {
            throw new Error(`이미 존재하는 직급입니다: ${name}`);
        }
        
        const newGrade = {
            id: `SG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: name,
            holidayBonusType: holidayBonusType,
            order: data.salaryGrades.length + 1,
            createdAt: new Date().toISOString()
        };
        
        data.salaryGrades.push(newGrade);
        this.saveGrades(data);
        
        로거_인사?.info('연봉제 직급 추가', { name, holidayBonusType });
        return newGrade;
    },
    
 /**
 * 호봉제 직급 수정
 * @param {string} id - 직급 ID
 * @param {string} newName - 새 직급명
 */
    updateRankGrade(id, newName) {
        const data = this.loadGrades();
        const grade = data.rankGrades.find(g => g.id === id);
        
        if (!grade) {
            throw new Error('직급을 찾을 수 없습니다.');
        }
        
 // 중복 체크 (자기 자신 제외)
        if (data.rankGrades.some(g => g.id !== id && g.name === newName)) {
            throw new Error(`이미 존재하는 직급입니다: ${newName}`);
        }
        
        const oldName = grade.name;
        grade.name = newName;
        grade.updatedAt = new Date().toISOString();
        
        this.saveGrades(data);
        로거_인사?.info('호봉제 직급 수정', { oldName, newName });
    },
    
 /**
 * 연봉제 직급 수정
 * @param {string} id - 직급 ID
 * @param {string} newName - 새 직급명
 * @param {string} holidayBonusType - 명절휴가비 유형
 */
    updateSalaryGrade(id, newName, holidayBonusType) {
        const data = this.loadGrades();
        const grade = data.salaryGrades.find(g => g.id === id);
        
        if (!grade) {
            throw new Error('직급을 찾을 수 없습니다.');
        }
        
 // 중복 체크 (자기 자신 제외)
        if (data.salaryGrades.some(g => g.id !== id && g.name === newName)) {
            throw new Error(`이미 존재하는 직급입니다: ${newName}`);
        }
        
        const oldName = grade.name;
        grade.name = newName;
        grade.holidayBonusType = holidayBonusType;
        grade.updatedAt = new Date().toISOString();
        
        this.saveGrades(data);
        로거_인사?.info('연봉제 직급 수정', { oldName, newName, holidayBonusType });
    },
    
 /**
 * 호봉제 직급 삭제
 * @param {string} id - 직급 ID
 */
    deleteRankGrade(id) {
        const data = this.loadGrades();
        const index = data.rankGrades.findIndex(g => g.id === id);
        
        if (index === -1) {
            throw new Error('직급을 찾을 수 없습니다.');
        }
        
        const deleted = data.rankGrades.splice(index, 1)[0];
        
 // 순서 재정렬
        data.rankGrades.forEach((g, i) => {
            g.order = i + 1;
        });
        
        this.saveGrades(data);
        로거_인사?.info('호봉제 직급 삭제', { name: deleted.name });
    },
    
 /**
 * 연봉제 직급 삭제
 * @param {string} id - 직급 ID
 */
    deleteSalaryGrade(id) {
        const data = this.loadGrades();
        const index = data.salaryGrades.findIndex(g => g.id === id);
        
        if (index === -1) {
            throw new Error('직급을 찾을 수 없습니다.');
        }
        
        const deleted = data.salaryGrades.splice(index, 1)[0];
        
 // 순서 재정렬
        data.salaryGrades.forEach((g, i) => {
            g.order = i + 1;
        });
        
        this.saveGrades(data);
        로거_인사?.info('연봉제 직급 삭제', { name: deleted.name });
    },
    
 /**
 * 직급 순서 변경
 * @param {string} type - 'rank' 또는 'salary'
 * @param {string} id - 직급 ID
 * @param {string} direction - 'up' 또는 'down'
 */
    moveGrade(type, id, direction) {
        const data = this.loadGrades();
        const grades = type === 'rank' ? data.rankGrades : data.salaryGrades;
        
        const index = grades.findIndex(g => g.id === id);
        if (index === -1) return;
        
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= grades.length) return;
        
 // 순서 교환
        [grades[index], grades[targetIndex]] = [grades[targetIndex], grades[index]];
        
 // 순서 재정렬
        grades.forEach((g, i) => {
            g.order = i + 1;
        });
        
        this.saveGrades(data);
        로거_인사?.debug('직급 순서 변경', { type, id, direction });
    }
};

// ===== UI 렌더링 =====

/**
 * 현재 활성 탭
 * @type {string}
 */
let currentSalaryTab = SALARY_TABS.GRADES;

/**
 * 현재 선택된 직급 연도
 * @type {number}
 */
let currentGradeYear = new Date().getFullYear();

/**
 * 급여 설정 모듈 초기화
 */
function initSalarySettingsModule() {
    로거_인사?.info('급여 설정 모듈 초기화');
    
    const container = document.getElementById('module-salary-settings');
    if (!container) {
        로거_인사?.error('급여 설정 컨테이너를 찾을 수 없음');
        return;
    }
    
    container.innerHTML = _generateSalarySettingsHTML();
    
 // 초기 탭 렌더링
    renderSalaryTab(SALARY_TABS.GRADES);
}

/**
 * 급여 설정 메인 HTML 생성
 * @private
 * @returns {string} HTML
 */
function _generateSalarySettingsHTML() {
    return `
        <div class="card">
            <div class="card-title"><span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> 급여 설정</div>
            <div class="alert alert-info">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>급여 계산에 필요한 기초 데이터를 설정합니다. 직급 → 급여표 → 직책수당 → 명절휴가비 순으로 설정하세요.</span>
            </div>
            
            <!-- 탭 메뉴 -->
            <div class="salary-tabs" style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:20px;">
                <button class="salary-tab-btn active" data-tab="grades" onclick="renderSalaryTab('grades')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 직급 관리
                </button>
                <button class="salary-tab-btn" data-tab="tables" onclick="renderSalaryTab('tables')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 급여표 관리
                </button>
                <button class="salary-tab-btn" data-tab="position" onclick="renderSalaryTab('position')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 직책수당 설정
                </button>
                <button class="salary-tab-btn" data-tab="holiday" onclick="renderSalaryTab('holiday')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> 명절휴가비 설정
                </button>
                <button class="salary-tab-btn" data-tab="ordinary" onclick="renderSalaryTab('ordinary')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 통상임금 설정
                </button>
                <button class="salary-tab-btn" data-tab="calculation" onclick="renderSalaryTab('calculation')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg> 수당 계산 설정
                </button>
            </div>
            
            <!-- 탭 컨텐츠 -->
            <div id="salaryTabContent"></div>
        </div>
        
        <style>
            .salary-tab-btn {
                padding: 12px 20px;
                background: transparent;
                border: none;
                border-bottom: 3px solid transparent;
                color: #6b7280;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .salary-tab-btn:hover {
                color: #111827;
                background: #f9fafb;
            }
            .salary-tab-btn.active {
                color: #4f46e5;
                border-bottom-color: #4f46e5;
            }
            .grade-list {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
            }
            .grade-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e5e7eb;
                background: white;
                position: relative;
            }
            .grade-item:last-child {
                border-bottom: none;
            }
            .grade-item:hover {
                background: #f9fafb;
            }
            .grade-order {
                width: 30px;
                color: #9ca3af;
                font-size: 13px;
            }
            .grade-name {
                flex: 1;
                font-weight: 500;
            }
            .grade-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-right: 12px;
            }
            .grade-badge.percent {
                background: #dbeafe;
                color: #1d4ed8;
            }
            .grade-badge.fixed {
                background: #fef3c7;
                color: #b45309;
            }
            .grade-actions {
                display: flex;
                gap: 4px;
            }
            .grade-actions button {
                padding: 4px 8px;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 12px;
            }
            .grade-actions button:hover {
                background: #f3f4f6;
            }
 /* 연도 선택 영역 스타일 */
            .grade-year-selector {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .grade-year-selector .year-select-group {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .grade-year-selector label {
                font-weight: 600;
                color: #374151;
            }
            .grade-year-selector select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                min-width: 120px;
            }
            .grade-year-selector .year-info {
                margin-top: 12px;
                font-size: 13px;
                color: #6b7280;
            }
            .grade-section {
                margin-bottom: 24px;
            }
            .grade-section-title {
                font-size: 15px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .grade-section-title .count {
                background: #e5e7eb;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
                color: #6b7280;
            }
            .grade-section-title .drag-hint {
                font-size: 11px;
                color: #9ca3af;
                font-weight: 400;
                margin-left: auto;
            }
 /* 드래그 앤 드롭 스타일 */
            .drag-handle {
                cursor: grab;
                color: #9ca3af;
                font-size: 14px;
                padding: 0 8px;
                user-select: none;
            }
            .drag-handle:hover {
                color: #6b7280;
            }
            .drag-handle:active {
                cursor: grabbing;
            }
            .grade-item[draggable="true"] {
                transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
            }
            .grade-item.dragging {
                opacity: 0.5;
                background: #e0e7ff;
                transform: scale(1.02);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .grade-item.drag-over {
                border-top: 3px solid #4f46e5;
                margin-top: -3px;
            }
 /* 드래그 위치 표시 - 상단 (앞에 삽입) */
            .grade-item.drag-over-top {
                border-top: 3px solid #4f46e5;
                margin-top: -3px;
            }
            .grade-item.drag-over-top::before {
                content: '▲ 여기 앞에 삽입';
                position: absolute;
                top: -18px;
                left: 40px;
                font-size: 11px;
                color: #4f46e5;
                font-weight: 600;
            }
 /* 드래그 위치 표시 - 하단 (뒤에 삽입) */
            .grade-item.drag-over-bottom {
                border-bottom: 3px solid #4f46e5;
                margin-bottom: -3px;
            }
            .grade-item.drag-over-bottom::after {
                content: '▼ 여기 뒤에 삽입';
                position: absolute;
                bottom: -18px;
                left: 40px;
                font-size: 11px;
                color: #4f46e5;
                font-weight: 600;
            }
            .grade-list.drag-active .grade-item:not(.dragging) {
                transition: transform 0.15s ease;
            }
            .add-grade-form {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
            }
            .add-grade-form input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
            }
            .add-grade-form select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
            }
            .add-grade-form button {
                padding: 8px 16px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            }
            .add-grade-form button:hover {
                background: #4338ca;
            }
            .empty-state {
                text-align: center;
                padding: 40px;
                color: #9ca3af;
            }
            .tab-coming-soon {
                text-align: center;
                padding: 60px 20px;
                color: #9ca3af;
            }
            .tab-coming-soon .icon {
                font-size: 48px;
                margin-bottom: 16px;
            }
        </style>
    `;
}

/**
 * 탭 렌더링
 * @param {string} tabId - 탭 ID
 */
function renderSalaryTab(tabId) {
    currentSalaryTab = tabId;
    
 // 탭 버튼 활성화
    document.querySelectorAll('.salary-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    const content = document.getElementById('salaryTabContent');
    if (!content) return;
    
    switch (tabId) {
        case SALARY_TABS.GRADES:
            content.innerHTML = _renderGradesTab();
 // 드래그 앤 드롭 이벤트 초기화
            _initGradeDragAndDrop();
            break;
        case SALARY_TABS.TABLES:
            content.innerHTML = _renderTablesTab();
            break;
        case SALARY_TABS.POSITION:
            content.innerHTML = _renderPositionTab();
            break;
        case SALARY_TABS.HOLIDAY:
            content.innerHTML = _renderHolidayTab();
            break;
        case SALARY_TABS.ORDINARY:
            content.innerHTML = _renderOrdinaryTab();
            break;
        case SALARY_TABS.CALCULATION:
            content.innerHTML = _renderCalculationTab();
            break;
        default:
            content.innerHTML = '';
    }
}

/**
 * 직급 관리 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderGradesTab() {
    const data = SalarySettingsManager.loadGrades();
    const rankGrades = data.rankGrades || [];
    const salaryGrades = data.salaryGrades || [];
    const gradeYears = SalarySettingsManager.getGradeYears();
    
 // 연도 옵션 생성 (실제 데이터가 있는 연도만)
    const currentYear = new Date().getFullYear();
    let yearOptions;
    
    if (gradeYears.length > 0) {
 // 데이터가 있는 연도만 표시
        yearOptions = [...gradeYears].sort((a, b) => b - a);
        
 // 현재 선택된 연도가 목록에 없으면 가장 최근 연도로 변경
        if (!yearOptions.includes(currentGradeYear)) {
            currentGradeYear = yearOptions[0];
        }
    } else {
 // 데이터가 없으면 현재 연도만 표시
        yearOptions = [currentYear];
        currentGradeYear = currentYear;
    }
    
    return `
        <!-- 연도 선택 -->
        <div class="grade-year-selector">
            <div class="year-select-group">
                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 연도 선택</label>
                <select id="gradeYearSelect" onchange="changeGradeYear(this.value)">
                    ${yearOptions.map(y => `
                        <option value="${y}" ${y === currentGradeYear ? 'selected' : ''}>
                            ${y}년
                        </option>
                    `).join('')}
                </select>
                <button class="btn btn-secondary btn-sm" onclick="createNewGradeYear()">+ 새 연도</button>
                <button class="btn btn-secondary btn-sm" onclick="copyGradesFromPrevYear()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 전년도 복사</button>
                <button class="btn btn-danger-outline btn-sm" onclick="deleteGradeYear()" ${gradeYears.length <= 1 ? 'disabled title="마지막 연도는 삭제할 수 없습니다"' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 연도 삭제</button>
            </div>
            <div class="year-info">
                ${gradeYears.length > 0 
                    ? `${currentGradeYear}년 데이터 (호봉제 ${rankGrades.length}개, 연봉제 ${salaryGrades.length}개)`
                    : `[주의] 저장된 데이터 없음 - 직급을 등록하거나 전년도를 복사하세요`
                }
            </div>
        </div>
        
        <!-- 기존 데이터에서 불러오기 / 일괄 삭제 -->
        <div class="import-grades-section" style="margin-bottom:20px;">
            <button class="btn btn-secondary" onclick="importGradesFromEmployees()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${currentGradeYear}년 근무 직원에서 직급 불러오기
            </button>
            <button class="btn btn-danger-outline" onclick="deleteAllGrades('rank')" style="margin-left:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 호봉제 전체 삭제
            </button>
            <button class="btn btn-danger-outline" onclick="deleteAllGrades('salary')" style="margin-left:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 연봉제 전체 삭제
            </button>
            <button class="btn btn-danger" onclick="deleteAllGrades('all')" style="margin-left:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 모두 삭제
            </button>
        </div>
        
        <!-- 호봉제 직급 -->
        <div class="grade-section">
            <div class="grade-section-title">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 호봉제 직급</span>
                <span class="count">${rankGrades.length}개</span>
                <span class="drag-hint">드래그하여 순서 변경 가능</span>
            </div>
            
            ${rankGrades.length > 0 ? `
                <div class="grade-list" id="rankGradeList" data-type="rank">
                    ${rankGrades.map((grade, index) => `
                        <div class="grade-item" data-id="${_escapeHtml(grade.id)}" draggable="true">
                            <span class="drag-handle" title="드래그하여 이동">☰</span>
                            <span class="grade-order">${index + 1}</span>
                            <span class="grade-name">${_escapeHtml(grade.name)}</span>
                            <div class="grade-actions">
                                <button onclick="moveRankGrade('${grade.id}', 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                                <button onclick="moveRankGrade('${grade.id}', 'down')" ${index === rankGrades.length - 1 ? 'disabled' : ''}>↓</button>
                                <button onclick="editRankGrade('${grade.id}')">수정</button>
                                <button onclick="deleteRankGrade('${grade.id}')">삭제</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="empty-state">등록된 호봉제 직급이 없습니다.</div>
            `}
            
            <div class="add-grade-form">
                <input type="text" id="newRankGradeName" placeholder="직급명 입력 (예: 일반직 3급)">
                <button onclick="addRankGrade()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 추가</button>
            </div>
        </div>
        
        <!-- 연봉제 직급 -->
        <div class="grade-section">
            <div class="grade-section-title">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> 연봉제 직급</span>
                <span class="count">${salaryGrades.length}개</span>
                <span class="drag-hint">드래그하여 순서 변경 가능</span>
            </div>
            
            ${salaryGrades.length > 0 ? `
                <div class="grade-list" id="salaryGradeList" data-type="salary">
                    ${salaryGrades.map((grade, index) => `
                        <div class="grade-item" data-id="${_escapeHtml(grade.id)}" draggable="true">
                            <span class="drag-handle" title="드래그하여 이동">☰</span>
                            <span class="grade-order">${index + 1}</span>
                            <span class="grade-name">${_escapeHtml(grade.name)}</span>
                            <span class="grade-badge ${grade.holidayBonusType}">
                                ${grade.holidayBonusType === 'percent' ? '비율' : '정액'}
                            </span>
                            <div class="grade-actions">
                                <button onclick="moveSalaryGrade('${grade.id}', 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                                <button onclick="moveSalaryGrade('${grade.id}', 'down')" ${index === salaryGrades.length - 1 ? 'disabled' : ''}>↓</button>
                                <button onclick="editSalaryGrade('${grade.id}')">수정</button>
                                <button onclick="deleteSalaryGrade('${grade.id}')">삭제</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="empty-state">등록된 연봉제 직급이 없습니다.</div>
            `}
            
            <div class="add-grade-form">
                <input type="text" id="newSalaryGradeName" placeholder="직급명 입력 (예: 영양사)">
                <select id="newSalaryGradeType">
                    <option value="percent">비율 (기본급×60%)</option>
                    <option value="fixed">정액</option>
                </select>
                <button onclick="addSalaryGrade()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 추가</button>
            </div>
        </div>
        
        <div class="alert alert-warning" style="margin-top:20px;">
            <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
            <span>직급명은 직원 등록 시 사용하는 직급(grade)과 동일하게 입력해야 급여 계산이 정확합니다.</span>
        </div>
    `;
}

/**
 * 직급 드래그 앤 드롭 초기화
 * @private
 */
function _initGradeDragAndDrop() {
 // 호봉제 직급 리스트
    const rankList = document.getElementById('rankGradeList');
    if (rankList) {
        _setupDragEvents(rankList, 'rank');
    }
    
 // 연봉제 직급 리스트
    const salaryList = document.getElementById('salaryGradeList');
    if (salaryList) {
        _setupDragEvents(salaryList, 'salary');
    }
}

/**
 * 드래그 이벤트 설정
 * @private
 * @param {HTMLElement} listEl - 리스트 요소
 * @param {string} type - 'rank' 또는 'salary'
 */
function _setupDragEvents(listEl, type) {
    let draggedItem = null;
    let draggedId = null;
    
    const items = listEl.querySelectorAll('.grade-item');
    
    items.forEach(item => {
 // 드래그 시작
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            draggedId = this.dataset.id;
            this.classList.add('dragging');
            listEl.classList.add('drag-active');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedId);
        });
        
 // 드래그 종료
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            listEl.classList.remove('drag-active');
            listEl.querySelectorAll('.grade-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            draggedItem = null;
            draggedId = null;
        });
        
 // 드래그 오버 - 마우스 위치로 상단/하단 구분
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this === draggedItem) return;
            
 // 마우스 Y 좌표로 상단/하단 판단
            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const isTop = e.clientY < midY;
            
 // 기존 클래스 제거
            this.classList.remove('drag-over-top', 'drag-over-bottom');
            
 // 위치에 따라 클래스 추가
            if (isTop) {
                this.classList.add('drag-over-top');
            } else {
                this.classList.add('drag-over-bottom');
            }
        });
        
 // 드래그 떠남
        item.addEventListener('dragleave', function() {
            this.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
 // 드롭 - 마우스 위치로 앞/뒤 결정
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            
            if (this === draggedItem) return;
            
 // 마우스 Y 좌표로 상단/하단 판단
            const rect = this.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertBefore = e.clientY < midY;
            
            this.classList.remove('drag-over-top', 'drag-over-bottom');
            
            const targetId = this.dataset.id;
            
 // 순서 변경 실행 (앞/뒤 구분)
            _reorderGrade(type, draggedId, targetId, insertBefore);
        });
    });
}

/**
 * 직급 순서 변경 (드래그 앤 드롭)
 * @private
 * @param {string} type - 'rank' 또는 'salary'
 * @param {string} draggedId - 드래그한 항목 ID
 * @param {string} targetId - 드롭 위치 항목 ID
 * @param {boolean} insertBefore - true면 타겟 앞에, false면 타겟 뒤에 삽입
 */
function _reorderGrade(type, draggedId, targetId, insertBefore = true) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const grades = type === 'rank' ? data.rankGrades : data.salaryGrades;
        
        if (!grades) return;
        
 // 인덱스 찾기
        const fromIndex = grades.findIndex(g => g.id === draggedId);
        let toIndex = grades.findIndex(g => g.id === targetId);
        
        if (fromIndex === -1 || toIndex === -1) return;
        if (fromIndex === toIndex) return;
        
 // 드래그 항목 제거
        const [movedItem] = grades.splice(fromIndex, 1);
        
 // 제거 후 인덱스 재계산
        toIndex = grades.findIndex(g => g.id === targetId);
        
 // 삽입 위치 결정 (앞/뒤)
        const insertIndex = insertBefore ? toIndex : toIndex + 1;
        
 // 삽입
        grades.splice(insertIndex, 0, movedItem);
        
 // order 값 재설정
        grades.forEach((grade, index) => {
            grade.order = index;
        });
        
 // 저장
        SalarySettingsManager.saveGrades(data);
        
 // UI 새로고침
        renderSalaryTab('grades');
        
        로거_인사?.info('직급 순서 변경 (드래그)', { 
            type, draggedId, targetId, 
            insertBefore, 
            결과: grades.map(g => g.name).join(' → ')
        });
        
    } catch (error) {
        로거_인사?.error('직급 순서 변경 실패', error);
        에러처리_인사?.handle(error, '순서 변경 중 오류가 발생했습니다.');
    }
}

/**
 * 준비 중 탭 렌더링
 * @private
 * @param {string} title - 탭 제목
 * @param {string} icon - 아이콘
 * @returns {string} HTML
 */
function _renderComingSoonTab(title, icon) {
    return `
        <div class="tab-coming-soon">
            <div class="icon">${icon}</div>
            <h3>${title}</h3>
            <p>Phase 1-2에서 구현 예정입니다.</p>
        </div>
    `;
}

// ===== 직급 연도 관리 함수 =====

/**
 * 직급 연도 변경
 * @param {string|number} year - 연도
 */
function changeGradeYear(year) {
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return;
    
    currentGradeYear = yearNum;
    로거_인사?.info('직급 연도 변경', { year: yearNum });
    renderSalaryTab(SALARY_TABS.GRADES);
}

/**
 * 새 연도 생성
 */
async function createNewGradeYear() {
    const defaultYear = new Date().getFullYear() + 1;
    const year = await showYearSelectModal(defaultYear, '생성할 연도 선택');
    if (!year) return;
    
    try {
        SalarySettingsManager.createGradeYear(year);
        currentGradeYear = year;
        renderSalaryTab(SALARY_TABS.GRADES);
        에러처리_인사?.success(`${year}년 직급 데이터가 생성되었습니다.`);
    } catch (error) {
        에러처리_인사?.handle(error, error.message);
    }
}

/**
 * 전년도 직급 복사
 */
function copyGradesFromPrevYear() {
    const gradeYears = SalarySettingsManager.getGradeYears();
    
 // 복사 가능한 연도 찾기 (현재 연도보다 이전)
    const availableYears = gradeYears.filter(y => y < currentGradeYear);
    
    if (availableYears.length === 0) {
        에러처리_인사?.warn('복사할 수 있는 이전 연도 데이터가 없습니다.');
        return;
    }
    
    const sourceYear = availableYears[0]; // 가장 최근 이전 연도
    
 // 현재 연도 데이터 확인
    const currentData = SalarySettingsManager.loadGrades();
    if (currentData.rankGrades.length > 0 || currentData.salaryGrades.length > 0) {
        if (!confirm(`${currentGradeYear}년에 이미 직급 데이터가 있습니다.\n${sourceYear}년 데이터로 덮어쓰시겠습니까?`)) {
            return;
        }
    }
    
    try {
        const result = SalarySettingsManager.copyGradesFromYear(sourceYear, currentGradeYear);
        renderSalaryTab(SALARY_TABS.GRADES);
        에러처리_인사?.success(
            `${sourceYear}년 → ${currentGradeYear}년 복사 완료\n` +
            `호봉제 ${result.rankCount}개, 연봉제 ${result.salaryCount}개`
        );
    } catch (error) {
        에러처리_인사?.handle(error, error.message);
    }
}

/**
 * 연도 삭제
 */
async function deleteGradeYear() {
    const gradeYears = SalarySettingsManager.getGradeYears();
    
 // 현재 연도에 데이터가 없으면 삭제할 것이 없음
    if (!gradeYears.includes(currentGradeYear)) {
        에러처리_인사?.info(`${currentGradeYear}년 데이터가 없습니다.`);
        return;
    }
    
 // 마지막 연도는 삭제 불가
    if (gradeYears.length <= 1) {
        에러처리_인사?.warn('마지막 연도는 삭제할 수 없습니다.');
        return;
    }
    
    const data = SalarySettingsManager.loadGrades();
    const rankCount = data.rankGrades?.length || 0;
    const salaryCount = data.salaryGrades?.length || 0;
    
 // 삭제 확인 모달
    const confirmed = await showDeleteConfirmModal(
        `${currentGradeYear}년 직급 데이터 삭제`,
        `포함된 데이터:\n• 호봉제 ${rankCount}개\n• 연봉제 ${salaryCount}개\n\n이 작업은 되돌릴 수 없습니다.`
    );
    
    if (!confirmed) {
        에러처리_인사?.info('삭제가 취소되었습니다.');
        return;
    }
    
    try {
        const deletedYear = currentGradeYear; // 삭제 전 연도 저장
        SalarySettingsManager.deleteGradeYear(deletedYear);
        
 // 다른 연도로 이동 (가장 최근 연도)
        const remainingYears = SalarySettingsManager.getGradeYears();
        if (remainingYears.length > 0) {
            currentGradeYear = remainingYears[0]; // 가장 최근 연도
        } else {
            currentGradeYear = new Date().getFullYear();
        }
        
        renderSalaryTab(SALARY_TABS.GRADES);
        에러처리_인사?.success(`${deletedYear}년 삭제 완료\n호봉제 ${rankCount}개, 연봉제 ${salaryCount}개 삭제됨`);
        로거_인사?.info('직급 연도 삭제', { year: deletedYear, rankCount, salaryCount });
        
    } catch (error) {
        에러처리_인사?.handle(error, error.message);
    }
}

// ===== 호봉제 직급 관리 함수 =====

/**
 * 호봉제 직급 추가
 */
function addRankGrade() {
    try {
        const input = document.getElementById('newRankGradeName');
        const name = (input?.value || '').trim();
        
        if (!name) {
            에러처리_인사?.warn('직급명을 입력하세요.');
            return;
        }
        
        SalarySettingsManager.addRankGrade(name);
        input.value = '';
        renderSalaryTab(SALARY_TABS.GRADES);
        
        에러처리_인사?.success(`호봉제 직급 '${name}' 추가 완료`);
        
    } catch (error) {
        로거_인사?.error('호봉제 직급 추가 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 호봉제 직급 수정
 * @param {string} id - 직급 ID
 */
async function editRankGrade(id) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const grade = data.rankGrades.find(g => g.id === id);
        
        if (!grade) {
            에러처리_인사?.warn('직급을 찾을 수 없습니다.');
            return;
        }
        
        const newName = await showTextInputModal('직급명 수정', '새 직급명을 입력하세요:', grade.name);
        if (!newName) return;  // 취소
        
        const trimmedName = newName.trim();
        if (!trimmedName) {
            에러처리_인사?.warn('직급명을 입력하세요.');
            return;
        }
        
        SalarySettingsManager.updateRankGrade(id, trimmedName);
        renderSalaryTab(SALARY_TABS.GRADES);
        
        에러처리_인사?.success(`직급명이 '${trimmedName}'(으)로 변경되었습니다.`);
        
    } catch (error) {
        로거_인사?.error('호봉제 직급 수정 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 호봉제 직급 삭제
 * @param {string} id - 직급 ID
 */
function deleteRankGrade(id) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const grade = data.rankGrades.find(g => g.id === id);
        
        if (!grade) {
            에러처리_인사?.warn('직급을 찾을 수 없습니다.');
            return;
        }
        
        const confirmed = confirm(`'${grade.name}' 직급을 삭제하시겠습니까?\n\n[주의] 이미 이 직급으로 급여표가 입력된 경우 문제가 발생할 수 있습니다.`);
        if (!confirmed) return;
        
        SalarySettingsManager.deleteRankGrade(id);
        renderSalaryTab(SALARY_TABS.GRADES);
        
        에러처리_인사?.success(`직급 '${grade.name}' 삭제 완료`);
        
    } catch (error) {
        로거_인사?.error('호봉제 직급 삭제 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 호봉제 직급 순서 변경
 * @param {string} id - 직급 ID
 * @param {string} direction - 'up' 또는 'down'
 */
function moveRankGrade(id, direction) {
    try {
        SalarySettingsManager.moveGrade('rank', id, direction);
        renderSalaryTab(SALARY_TABS.GRADES);
    } catch (error) {
        로거_인사?.error('호봉제 직급 순서 변경 실패', error);
    }
}

// ===== 연봉제 직급 관리 함수 =====

/**
 * 연봉제 직급 추가
 */
function addSalaryGrade() {
    try {
        const nameInput = document.getElementById('newSalaryGradeName');
        const typeSelect = document.getElementById('newSalaryGradeType');
        
        const name = (nameInput?.value || '').trim();
        const type = typeSelect?.value || HOLIDAY_BONUS_TYPES.PERCENT;
        
        if (!name) {
            에러처리_인사?.warn('직급명을 입력하세요.');
            return;
        }
        
        SalarySettingsManager.addSalaryGrade(name, type);
        nameInput.value = '';
        renderSalaryTab(SALARY_TABS.GRADES);
        
        const typeLabel = type === 'percent' ? '비율' : '정액';
        에러처리_인사?.success(`연봉제 직급 '${name}' (${typeLabel}) 추가 완료`);
        
    } catch (error) {
        로거_인사?.error('연봉제 직급 추가 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 연봉제 직급 수정
 * @param {string} id - 직급 ID
 */
async function editSalaryGrade(id) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const grade = data.salaryGrades.find(g => g.id === id);
        
        if (!grade) {
            에러처리_인사?.warn('직급을 찾을 수 없습니다.');
            return;
        }
        
 // 직급명 입력 모달
        const newName = await showTextInputModal('직급명 수정', '새 직급명을 입력하세요:', grade.name);
        if (!newName) return;
        
        const trimmedName = newName.trim();
        if (!trimmedName) {
            에러처리_인사?.warn('직급명을 입력하세요.');
            return;
        }
        
 // 명절휴가비 유형 선택 모달
        const typeChoice = await showSelectModal('명절휴가비 유형 선택', [
            { value: '1', label: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 비율 (기본급×60%)' },
            { value: '2', label: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 정액' }
        ]);
        if (!typeChoice) return;
        
        const newType = typeChoice === '2' ? HOLIDAY_BONUS_TYPES.FIXED : HOLIDAY_BONUS_TYPES.PERCENT;
        
        SalarySettingsManager.updateSalaryGrade(id, trimmedName, newType);
        renderSalaryTab(SALARY_TABS.GRADES);
        
        에러처리_인사?.success(`연봉제 직급 수정 완료`);
        
    } catch (error) {
        로거_인사?.error('연봉제 직급 수정 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 연봉제 직급 삭제
 * @param {string} id - 직급 ID
 */
function deleteSalaryGrade(id) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const grade = data.salaryGrades.find(g => g.id === id);
        
        if (!grade) {
            에러처리_인사?.warn('직급을 찾을 수 없습니다.');
            return;
        }
        
        const confirmed = confirm(`'${grade.name}' 직급을 삭제하시겠습니까?\n\n[주의] 이미 이 직급으로 급여표가 입력된 경우 문제가 발생할 수 있습니다.`);
        if (!confirmed) return;
        
        SalarySettingsManager.deleteSalaryGrade(id);
        renderSalaryTab(SALARY_TABS.GRADES);
        
        에러처리_인사?.success(`직급 '${grade.name}' 삭제 완료`);
        
    } catch (error) {
        로거_인사?.error('연봉제 직급 삭제 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 연봉제 직급 순서 변경
 * @param {string} id - 직급 ID
 * @param {string} direction - 'up' 또는 'down'
 */
function moveSalaryGrade(id, direction) {
    try {
        SalarySettingsManager.moveGrade('salary', id, direction);
        renderSalaryTab(SALARY_TABS.GRADES);
    } catch (error) {
        로거_인사?.error('연봉제 직급 순서 변경 실패', error);
    }
}

// ===== 급여표 관리 탭 =====

/**
 * 현재 선택된 급여표 연도
 * @type {number}
 */
let currentSalaryTableYear = new Date().getFullYear();

/**
 * 급여표 관리 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderTablesTab() {
    const gradesData = SalarySettingsManager.loadGrades();
    const rankGrades = gradesData.rankGrades || [];
    const salaryGrades = gradesData.salaryGrades || [];
    
 // 등록된 직급이 없으면 안내 메시지
    if (rankGrades.length === 0 && salaryGrades.length === 0) {
        return `
            <div class="alert alert-warning">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                <span>먼저 <strong>직급 관리</strong> 탭에서 직급을 등록해주세요.</span>
            </div>
        `;
    }
    
    const availableYears = SalarySettingsManager.getAvailableYears();
    const yearSettings = SalarySettingsManager.getSettingsByYear(currentSalaryTableYear);
    const yearTable = SalarySettingsManager.getSalaryTableByYear(currentSalaryTableYear);
    
    return `
        <!-- 연도 선택 및 설정 -->
        <div class="salary-table-header">
            <div class="year-selector">
                <label>연도 선택</label>
                <select id="salaryTableYear" onchange="changeSalaryTableYear(this.value)">
                    ${_generateYearOptionsForTable(currentSalaryTableYear, availableYears)}
                </select>
                <button class="btn btn-secondary btn-sm" onclick="createNewYearTable()">+ 새 연도</button>
                <button class="btn btn-secondary btn-sm" onclick="copyFromPrevYear()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 전년도 복사</button>
            </div>
            <div class="max-rank-setting">
                <label>최대 호봉</label>
                <input type="number" id="maxRankInput" value="${yearSettings.maxRank || 31}" 
                       min="1" max="50" style="width:60px;" onchange="updateMaxRank(this.value)">
                <span class="hint">호봉</span>
            </div>
        </div>
        
        <!-- 호봉제 급여표 -->
        ${rankGrades.length > 0 ? `
            <div class="salary-table-section">
                <div class="section-header">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 호봉제 급여표</h4>
                    <div class="section-actions">
                        <button class="btn btn-secondary btn-sm" onclick="downloadRankTableExcel()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 엑셀 다운로드</button>
                        <button class="btn btn-secondary btn-sm" onclick="showRankTableUpload()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 엑셀 업로드</button>
                    </div>
                </div>
                <div class="table-container">
                    ${_renderRankSalaryTable(rankGrades, yearTable.rank || {}, yearSettings.maxRank || 31)}
                </div>
            </div>
        ` : ''}
        
        <!-- 연봉제 급여표 -->
        ${salaryGrades.length > 0 ? `
            <div class="salary-table-section">
                <div class="section-header">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> 연봉제 급여표</h4>
                </div>
                <div class="table-container">
                    ${_renderSalarySalaryTable(salaryGrades, yearTable.salary || {})}
                </div>
            </div>
        ` : ''}
        
        <!-- 저장 버튼 -->
        <div class="save-button-container">
            <button class="btn btn-primary btn-lg" onclick="saveSalaryTable()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 급여표 저장</button>
        </div>
        
        <!-- 엑셀 업로드 모달 -->
        <div id="rankTableUploadModal" class="salary-modal" style="display:none;">
            <div class="salary-modal-content">
                <div class="salary-modal-header">
                    <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 호봉제 급여표 엑셀 업로드</h3>
                    <button onclick="closeRankTableUpload()">×</button>
                </div>
                <div class="salary-modal-body">
                    <div class="alert alert-info">
                        <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                        <span>엑셀 파일 형식: 첫 행은 헤더(호봉), 첫 열은 직급명</span>
                    </div>
                    <input type="file" id="rankTableExcelFile" accept=".xlsx,.xls" onchange="handleRankTableExcel(this)">
                </div>
            </div>
        </div>
        
        <style>
            .salary-table-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 20px;
                padding: 16px;
                background: #f8f9fe;
                border-radius: 8px;
            }
            .year-selector {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .year-selector label, .max-rank-setting label {
                font-weight: 600;
                color: #374151;
                margin-right: 4px;
            }
            .year-selector select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
            }
            .max-rank-setting {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .max-rank-setting input {
                padding: 8px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                text-align: center;
            }
            .max-rank-setting .hint {
                color: #6b7280;
                font-size: 13px;
            }
            .salary-table-section {
                margin-bottom: 24px;
            }
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .section-header h4 {
                margin: 0;
                color: #374151;
            }
            .section-actions {
                display: flex;
                gap: 8px;
            }
            .table-container {
                overflow-x: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
            .salary-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            .salary-table th, .salary-table td {
                padding: 8px 10px;
                border: 1px solid #e5e7eb;
                text-align: center;
            }
            .salary-table th {
                background: #f3f4f6;
                font-weight: 600;
                color: #374151;
                position: sticky;
                top: 0;
            }
            .salary-table th.grade-col {
                position: sticky;
                left: 0;
                z-index: 2;
                background: #e5e7eb;
                min-width: 120px;
            }
            .salary-table td.grade-col {
                position: sticky;
                left: 0;
                background: #f9fafb;
                font-weight: 500;
                text-align: left;
            }
 /* 호봉제 급여표 - 호봉 열 (좌측 고정) */
            .salary-table th.rank-col {
                position: sticky;
                left: 0;
                z-index: 2;
                background: #e5e7eb;
                min-width: 80px;
            }
            .salary-table td.rank-col {
                position: sticky;
                left: 0;
                background: #f9fafb;
                font-weight: 500;
                text-align: center;
            }
 /* 호봉제 급여표 - 직급 헤더 고정 */
            .rank-salary-table thead th {
                position: sticky;
                top: 0;
                z-index: 1;
                min-width: 110px;
            }
            .rank-salary-table thead th.rank-col {
                z-index: 3;
            }
            .salary-table input {
                width: 90px;
                padding: 4px 6px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                text-align: right;
                font-size: 13px;
            }
            .salary-table input:focus {
                outline: none;
                border-color: #4f46e5;
                box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
            }
            .save-button-container {
                text-align: center;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }
            .btn-lg {
                padding: 12px 32px;
                font-size: 16px;
            }
 /* 삭제 버튼 스타일 */
            .btn-danger {
                background: #dc2626;
                color: white;
                border: 1px solid #dc2626;
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: background 0.2s;
            }
            .btn-danger:hover {
                background: #b91c1c;
            }
            .btn-danger-outline {
                background: white;
                color: #dc2626;
                border: 1px solid #dc2626;
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .btn-danger-outline:hover {
                background: #fef2f2;
            }
            .salary-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .salary-modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                overflow: hidden;
            }
            .salary-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            .salary-modal-header h3 {
                margin: 0;
            }
            .salary-modal-header button {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
            }
            .salary-modal-body {
                padding: 20px;
            }
            .salary-salary-table td.label-col {
                text-align: left;
                font-weight: 500;
                background: #f9fafb;
            }
        </style>
    `;
}

/**
 * 연도 옵션 생성
 * @private
 */
function _generateYearOptionsForTable(selectedYear, availableYears) {
    const currentYear = new Date().getFullYear();
    const years = new Set([...availableYears, currentYear, currentYear + 1]);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    return sortedYears.map(year => 
        `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

/**
 * 호봉제 급여표 테이블 렌더링
 * @private
 * @description 호봉이 행(세로), 직급이 열(가로)로 표시
 */
function _renderRankSalaryTable(rankGrades, rankData, maxRank) {
    const ranks = Array.from({ length: maxRank }, (_, i) => i + 1);
    
    let html = '<table class="salary-table rank-salary-table">';
    
 // 헤더 (직급)
    html += '<thead><tr>';
    html += '<th class="rank-col">호봉</th>';
    rankGrades.forEach(grade => {
        html += `<th>${_escapeHtml(grade.name)}</th>`;
    });
    html += '</tr></thead>';
    
 // 본문 (호봉별 데이터)
    html += '<tbody>';
    ranks.forEach(rank => {
        html += '<tr>';
        html += `<td class="rank-col">${rank}호봉</td>`;
        rankGrades.forEach(grade => {
            const gradeData = rankData[grade.name] || {};
            const value = gradeData[rank] || '';
            html += `<td><input type="text" 
                data-grade="${_escapeHtml(grade.name)}" 
                data-rank="${rank}" 
                data-type="rank"
                value="${value ? _formatNumber(value) : ''}" 
                onchange="onSalaryInputChange(this)"
                onblur="formatSalaryInput(this)"
                placeholder="0"></td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    return html;
}

/**
 * 연봉제 급여표 테이블 렌더링
 * @private
 */
function _renderSalarySalaryTable(salaryGrades, salaryData) {
    let html = '<table class="salary-table salary-salary-table">';
    
 // 헤더
    html += '<thead><tr>';
    html += '<th style="min-width:150px;">직급</th>';
    html += '<th>명절휴가비 유형</th>';
    html += '<th>기본급</th>';
    html += '<th>설 명절휴가비</th>';
    html += '<th>추석 명절휴가비</th>';
    html += '</tr></thead>';
    
 // 본문
    html += '<tbody>';
    salaryGrades.forEach(grade => {
        const gradeData = salaryData[grade.name] || {};
        const isFixed = grade.holidayBonusType === 'fixed';
        const typeLabel = isFixed ? '정액' : '비율 (기본급×%)';
        
        html += '<tr>';
        html += `<td class="label-col">${_escapeHtml(grade.name)}</td>`;
        html += `<td><span class="grade-badge ${grade.holidayBonusType}">${typeLabel}</span></td>`;
        html += `<td><input type="text" 
            data-grade="${_escapeHtml(grade.name)}" 
            data-field="baseSalary"
            data-type="salary"
            value="${gradeData.baseSalary ? _formatNumber(gradeData.baseSalary) : ''}" 
            onchange="onSalaryInputChange(this)"
            onblur="formatSalaryInput(this)"
            placeholder="0"></td>`;
        html += `<td><input type="text" 
            data-grade="${_escapeHtml(grade.name)}" 
            data-field="seolBonus"
            data-type="salary"
            value="${gradeData.seolBonus ? _formatNumber(gradeData.seolBonus) : ''}" 
            onchange="onSalaryInputChange(this)"
            onblur="formatSalaryInput(this)"
            placeholder="0"
            ${!isFixed ? 'disabled style="background:#f3f4f6;"' : ''}></td>`;
        html += `<td><input type="text" 
            data-grade="${_escapeHtml(grade.name)}" 
            data-field="chuseokBonus"
            data-type="salary"
            value="${gradeData.chuseokBonus ? _formatNumber(gradeData.chuseokBonus) : ''}" 
            onchange="onSalaryInputChange(this)"
            onblur="formatSalaryInput(this)"
            placeholder="0"
            ${!isFixed ? 'disabled style="background:#f3f4f6;"' : ''}></td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    return html;
}

/**
 * 숫자 포맷 (천 단위 콤마)
 * @private
 */
function _formatNumber(num) {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('ko-KR');
}

/**
 * 문자열에서 숫자 추출
 * @private
 */
function _parseNumber(str) {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

// ===== 급여표 관리 이벤트 핸들러 =====

/**
 * 급여표 연도 변경
 * @param {string} year - 연도
 */
function changeSalaryTableYear(year) {
    currentSalaryTableYear = Number(year);
    renderSalaryTab(SALARY_TABS.TABLES);
}

/**
 * 새 연도 급여표 생성
 */
async function createNewYearTable() {
    const defaultYear = new Date().getFullYear() + 1;
    const yearNum = await showYearSelectModal(defaultYear, '급여표 생성 연도 선택');
    if (!yearNum) return;
    
    const tables = SalarySettingsManager.loadSalaryTables();
    if (tables[String(yearNum)]) {
        에러처리_인사?.warn(`${yearNum}년 급여표가 이미 존재합니다.`);
        return;
    }
    
 // 빈 급여표 생성
    tables[String(yearNum)] = { rank: {}, salary: {} };
    SalarySettingsManager.saveSalaryTables(tables);
    
 // 기본 설정 생성
    SalarySettingsManager.saveSettingsByYear(yearNum, {
        maxRank: 31,
        holidayBonus: {
            "설": { holidayDate: "", rate: 0.6 },
            "추석": { holidayDate: "", rate: 0.6 }
        }
    });
    
    currentSalaryTableYear = yearNum;
    renderSalaryTab(SALARY_TABS.TABLES);
    에러처리_인사?.success(`${yearNum}년 급여표가 생성되었습니다.`);
}

/**
 * 전년도 급여표 복사
 */
function copyFromPrevYear() {
    const prevYear = currentSalaryTableYear - 1;
    
    if (!confirm(`${prevYear}년 급여표를 ${currentSalaryTableYear}년으로 복사하시겠습니까?\n\n[주의] 현재 ${currentSalaryTableYear}년 데이터는 덮어씌워집니다.`)) {
        return;
    }
    
    try {
        SalarySettingsManager.copyFromPreviousYear(currentSalaryTableYear);
        renderSalaryTab(SALARY_TABS.TABLES);
        에러처리_인사?.success(`${prevYear}년 급여표가 복사되었습니다.`);
    } catch (error) {
        로거_인사?.error('전년도 복사 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 최대 호봉 업데이트
 * @param {string} value - 최대 호봉
 */
function updateMaxRank(value) {
    const maxRank = Number(value);
    if (isNaN(maxRank) || maxRank < 1 || maxRank > 50) {
        에러처리_인사?.warn('최대 호봉은 1~50 사이여야 합니다.');
        return;
    }
    
    const settings = SalarySettingsManager.getSettingsByYear(currentSalaryTableYear);
    settings.maxRank = maxRank;
    SalarySettingsManager.saveSettingsByYear(currentSalaryTableYear, settings);
    
    renderSalaryTab(SALARY_TABS.TABLES);
}

/**
 * 급여 입력값 변경 핸들러
 * @param {HTMLInputElement} input - 입력 요소
 */
function onSalaryInputChange(input) {
 // 숫자만 허용
    const value = _parseNumber(input.value);
    input.value = value ? _formatNumber(value) : '';
}

/**
 * 급여 입력값 포맷
 * @param {HTMLInputElement} input - 입력 요소
 */
function formatSalaryInput(input) {
    const value = _parseNumber(input.value);
    input.value = value ? _formatNumber(value) : '';
}

/**
 * 급여표 저장
 */
function saveSalaryTable() {
    try {
        const yearTable = {
            rank: {},
            salary: {}
        };
        
 // 호봉제 데이터 수집
        document.querySelectorAll('input[data-type="rank"]').forEach(input => {
            const grade = input.dataset.grade;
            const rank = Number(input.dataset.rank);
            const value = _parseNumber(input.value);
            
            if (!yearTable.rank[grade]) {
                yearTable.rank[grade] = {};
            }
            if (value > 0) {
                yearTable.rank[grade][rank] = value;
            }
        });
        
 // 연봉제 데이터 수집
        document.querySelectorAll('input[data-type="salary"]').forEach(input => {
            const grade = input.dataset.grade;
            const field = input.dataset.field;
            const value = _parseNumber(input.value);
            
            if (!yearTable.salary[grade]) {
                yearTable.salary[grade] = {};
            }
            if (value > 0) {
                yearTable.salary[grade][field] = value;
            }
        });
        
 // 저장
        SalarySettingsManager.saveSalaryTableByYear(currentSalaryTableYear, yearTable);
        에러처리_인사?.success(`${currentSalaryTableYear}년 급여표가 저장되었습니다.`);
        
        로거_인사?.info('급여표 저장 완료', { year: currentSalaryTableYear });
        
    } catch (error) {
        로거_인사?.error('급여표 저장 실패', error);
        에러처리_인사?.warn('급여표 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 호봉제 급여표 엑셀 다운로드
 * 시스템 UI와 동일하게 직급=열, 호봉=행 형식으로 출력
 */
function downloadRankTableExcel() {
    try {
        const gradesData = SalarySettingsManager.loadGrades();
        const rankGrades = gradesData.rankGrades || [];
        const yearTable = SalarySettingsManager.getSalaryTableByYear(currentSalaryTableYear);
        const yearSettings = SalarySettingsManager.getSettingsByYear(currentSalaryTableYear);
        const maxRank = yearSettings.maxRank || 31;
        
        if (rankGrades.length === 0) {
            에러처리_인사?.warn('등록된 호봉제 직급이 없습니다.');
            return;
        }
        
 // 데이터 구성 (직급=열, 호봉=행)
        const data = [];
        
 // 헤더 행: ['호봉', 직급1, 직급2, ...]
        const header = ['호봉'];
        rankGrades.forEach(grade => {
            header.push(grade.name);
        });
        data.push(header);
        
 // 데이터 행: 각 호봉별로 한 행씩
        for (let rankNum = 1; rankNum <= maxRank; rankNum++) {
            const row = [`${rankNum}호봉`];
            rankGrades.forEach(grade => {
                const gradeData = yearTable.rank?.[grade.name] || {};
                row.push(gradeData[rankNum] || '');
            });
            data.push(row);
        }
        
 // 워크북 생성
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '호봉제급여표');
        
 // 다운로드
        XLSX.writeFile(wb, `호봉제급여표_${currentSalaryTableYear}년.xlsx`);
        
        에러처리_인사?.success('엑셀 파일이 다운로드되었습니다.');
        
    } catch (error) {
        로거_인사?.error('엑셀 다운로드 실패', error);
        에러처리_인사?.warn('엑셀 다운로드 중 오류가 발생했습니다.');
    }
}

/**
 * 호봉제 급여표 업로드 모달 표시
 */
function showRankTableUpload() {
    const modal = document.getElementById('rankTableUploadModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * 호봉제 급여표 업로드 모달 닫기
 */
function closeRankTableUpload() {
    const modal = document.getElementById('rankTableUploadModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const fileInput = document.getElementById('rankTableExcelFile');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * 호봉제 급여표 엑셀 파일 처리
 * @param {HTMLInputElement} input - 파일 입력 요소
 */
function handleRankTableExcel(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                에러처리_인사?.warn('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
 // 헤더에서 직급명 추출 (직급=열, 호봉=행 형식)
 // 헤더: ['호봉', 직급1, 직급2, ...]
            const header = jsonData[0];
            const gradeNames = header.slice(1); // 첫 번째 열('호봉') 제외
            
            if (gradeNames.length === 0) {
                에러처리_인사?.warn('직급 정보가 없습니다. 헤더 형식을 확인하세요.');
                return;
            }
            
            const yearTable = SalarySettingsManager.getSalaryTableByYear(currentSalaryTableYear);
            yearTable.rank = yearTable.rank || {};
            
 // 직급별 데이터 초기화
            gradeNames.forEach(gradeName => {
                if (gradeName) {
                    yearTable.rank[gradeName] = {};
                }
            });
            
 // 데이터 행 파싱 (각 행이 호봉)
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const rankLabel = row[0]; // '1호봉', '2호봉' 등
                if (!rankLabel) continue;
                
 // 호봉 번호 추출 (숫자만)
                const rankNum = parseInt(String(rankLabel).replace(/[^0-9]/g, ''));
                if (isNaN(rankNum) || rankNum < 1) continue;
                
 // 각 직급별 금액 저장
                for (let j = 1; j < row.length; j++) {
                    const gradeName = gradeNames[j - 1];
                    if (!gradeName) continue;
                    
                    const value = _parseNumber(row[j]);
                    if (value > 0) {
                        yearTable.rank[gradeName][rankNum] = value;
                    }
                }
            }
            
 // 저장
            SalarySettingsManager.saveSalaryTableByYear(currentSalaryTableYear, yearTable);
            closeRankTableUpload();
            renderSalaryTab(SALARY_TABS.TABLES);
            
            에러처리_인사?.success(`엑셀 데이터가 업로드되었습니다. (${gradeNames.length}개 직급)`);
            
        } catch (error) {
            로거_인사?.error('엑셀 파일 처리 실패', error);
            에러처리_인사?.warn('엑셀 파일 처리 중 오류가 발생했습니다.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ===== 직책수당 설정 탭 =====

/**
 * 현재 선택된 직책수당 연도
 * @type {number}
 */
let currentPositionAllowanceYear = new Date().getFullYear();

/**
 * 직책수당 설정 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderPositionTab() {
    const allPositions = SalarySettingsManager.getPositionsForYear(currentPositionAllowanceYear); // 해당 연도 재직자 직위 (조직도 순서)
    const availableYears = SalarySettingsManager.getPositionAllowanceYears();
    const yearData = SalarySettingsManager.getPositionAllowancesByYear(currentPositionAllowanceYear);
    
 // 직책수당이 설정된 직위만 (금액 > 0)
    const savedPositions = Object.entries(yearData)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]); // 금액 높은 순
    
 // 아직 추가되지 않은 직위 (드롭다운용)
    const savedPositionNames = savedPositions.map(([name]) => name);
    const availablePositions = allPositions.filter(p => !savedPositionNames.includes(p));
    
    return `
        <style>
 /* 직책수당 설정 스타일 */
            .pa-container {
                max-width: 800px;
                margin: 0 auto;
            }
            
            .pa-year-section {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-radius: 16px;
                padding: 24px 28px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
            }
            .pa-year-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .pa-year-title h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #1e40af;
            }
            .pa-year-controls {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }
            .pa-year-select-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
                background: white;
                padding: 8px 16px;
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            }
            .pa-year-select-wrapper label {
                font-weight: 600;
                color: #1e40af;
                font-size: 15px;
            }
            .pa-year-select-wrapper select {
                padding: 10px 36px 10px 16px;
                font-size: 18px;
                font-weight: 700;
                border: 2px solid #3b82f6;
                border-radius: 8px;
                background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%231e40af' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 8px center;
                background-size: 20px;
                appearance: none;
                cursor: pointer;
                color: #1e40af;
                min-width: 140px;
            }
            .pa-year-btn {
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 600;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .pa-year-btn-new {
                background: #1e40af;
                color: white;
            }
            .pa-year-btn-new:hover {
                background: #1e3a8a;
            }
            .pa-year-btn-copy {
                background: white;
                color: #1e40af;
                border: 2px solid #3b82f6;
            }
            .pa-year-btn-copy:hover {
                background: #eff6ff;
            }
            
 /* 안내 박스 */
            .pa-info-box {
                background: #f0fdf4;
                border: 1px solid #86efac;
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 24px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .pa-info-box .info-icon {
                font-size: 20px;
            }
            .pa-info-box .info-text {
                font-size: 14px;
                color: #166534;
                line-height: 1.6;
            }
            
 /* 직위 추가 섹션 */
            .pa-add-section {
                background: white;
                border: 2px dashed #3b82f6;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
            }
            .pa-add-title {
                font-size: 16px;
                font-weight: 700;
                color: #1e40af;
                margin-bottom: 16px;
            }
            .pa-add-form {
                display: flex;
                gap: 12px;
                align-items: flex-end;
                flex-wrap: wrap;
            }
            .pa-add-field {
                flex: 1;
                min-width: 200px;
            }
            .pa-add-field label {
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 6px;
            }
            .pa-add-field select,
            .pa-add-field input {
                width: 100%;
                padding: 12px 14px;
                font-size: 15px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
            }
            .pa-add-field select:focus,
            .pa-add-field input:focus {
                outline: none;
                border-color: #3b82f6;
            }
            .pa-add-field input[type="text"].amount-input {
                text-align: right;
                font-weight: 600;
            }
            .pa-add-btn {
                padding: 12px 24px;
                font-size: 15px;
                font-weight: 700;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                white-space: nowrap;
            }
            .pa-add-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
 /* 직위 목록 */
            .pa-list-section {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 24px;
            }
            .pa-list-header {
                background: #f9fafb;
                padding: 16px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .pa-list-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 700;
                color: #374151;
            }
            .pa-list-header .count-badge {
                background: #3b82f6;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
            }
            
            .pa-list {
                padding: 0;
            }
            .pa-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 18px 24px;
                border-bottom: 1px solid #f3f4f6;
                transition: background 0.15s;
            }
            .pa-item:last-child {
                border-bottom: none;
            }
            .pa-item:hover {
                background: #f9fafb;
            }
            .pa-item-name {
                font-weight: 600;
                font-size: 15px;
                color: #1f2937;
            }
            .pa-item-controls {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .pa-item-input {
                width: 150px;
                padding: 10px 14px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                text-align: right;
                font-size: 15px;
                font-weight: 600;
            }
            .pa-item-input:focus {
                outline: none;
                border-color: #3b82f6;
            }
            .pa-item-unit {
                color: #6b7280;
                font-size: 14px;
            }
            .pa-item-delete {
                padding: 8px 12px;
                background: #fee2e2;
                color: #dc2626;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
            }
            .pa-item-delete:hover {
                background: #fecaca;
            }
            
            .pa-empty {
                padding: 48px 24px;
                text-align: center;
                color: #9ca3af;
            }
            .pa-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
            .pa-empty-text {
                font-size: 15px;
            }
            
 /* 저장 버튼 */
            .pa-save-section {
                text-align: center;
            }
            .pa-save-btn {
                padding: 16px 48px;
                font-size: 16px;
                font-weight: 700;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            .pa-save-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
            }
        </style>
        
        <div class="pa-container">
            <!-- 연도 선택 영역 -->
            <div class="pa-year-section">
                <div class="pa-year-title">
                    <span style="font-size:28px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                    <h3>직책수당 설정</h3>
                </div>
                <div class="pa-year-controls">
                    <div class="pa-year-select-wrapper">
                        <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 연도</label>
                        <select id="positionAllowanceYear" onchange="changePositionAllowanceYear(this.value)">
                            ${_generateYearOptionsForPosition(currentPositionAllowanceYear, availableYears)}
                        </select>
                    </div>
                    <button class="pa-year-btn pa-year-btn-new" onclick="createNewPositionYear()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 새 연도
                    </button>
                    <button class="pa-year-btn pa-year-btn-copy" onclick="copyPositionFromPrevYear()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 전년도 복사
                    </button>
                </div>
            </div>
            
            <!-- 안내 박스 -->
            <div class="pa-info-box">
                <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span class="info-text">
                    직책수당을 지급할 <strong>직위를 추가</strong>하고 금액을 입력하세요.
                    직원 데이터에서 사용 중인 직위를 선택하거나, 새 직위를 직접 입력할 수 있습니다.
                </span>
            </div>
            
            <!-- 직위 추가 섹션 -->
            <div class="pa-add-section">
                <div class="pa-add-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 직책수당 직위 추가</div>
                <div class="pa-add-form">
                    <div class="pa-add-field">
                        <label>직위 선택</label>
                        <select id="paSelectPosition" onchange="onPaPositionSelect(this)">
                            <option value="">-- 직위 선택 --</option>
                            ${availablePositions.map(p => `<option value="${_escapeHtml(p)}">${_escapeHtml(p)}</option>`).join('')}
                            <option value="__custom__"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 직접 입력...</option>
                        </select>
                    </div>
                    <div class="pa-add-field" id="paCustomInputWrapper" style="display:none;">
                        <label>직위명 직접 입력</label>
                        <input type="text" id="paCustomPosition" placeholder="직위명 입력">
                    </div>
                    <div class="pa-add-field" style="max-width:180px;">
                        <label>직책수당 금액</label>
                        <input type="text" id="paAddAmount" class="amount-input" placeholder="0" 
                            onblur="formatPositionAllowanceInput(this)">
                    </div>
                    <button class="pa-add-btn" onclick="addPositionAllowance()">추가</button>
                </div>
            </div>
            
            <!-- 등록된 직위 목록 -->
            <div class="pa-list-section">
                <div class="pa-list-header">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 등록된 직책수당</h4>
                    <span class="count-badge">${savedPositions.length}개</span>
                </div>
                
                ${savedPositions.length > 0 ? `
                    <div class="pa-list">
                        ${savedPositions.map(([position, amount]) => `
                            <div class="pa-item" data-position="${_escapeHtml(position)}">
                                <span class="pa-item-name">${_escapeHtml(position)}</span>
                                <div class="pa-item-controls">
                                    <input type="text" 
                                        class="pa-item-input"
                                        id="positionAllowance_${_escapeHtml(position).replace(/\s/g, '_')}"
                                        data-position="${_escapeHtml(position)}"
                                        value="${_formatNumber(amount)}"
                                        onchange="onPositionAllowanceChange(this)"
                                        onblur="formatPositionAllowanceInput(this)">
                                    <span class="pa-item-unit">원</span>
                                    <button class="pa-item-delete" onclick="deletePositionAllowance('${_escapeHtml(position)}')">삭제</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="pa-empty">
                        <div class="pa-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div>
                        <div class="pa-empty-text">등록된 직책수당이 없습니다.<br>위에서 직위를 추가해주세요.</div>
                    </div>
                `}
            </div>
            
            <!-- 저장 버튼 -->
            <div class="pa-save-section">
                <button class="pa-save-btn" onclick="savePositionAllowances()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 직책수당 저장</button>
            </div>
        </div>
    `;
}

/**
 * 직책수당 연도 옵션 생성
 * @private
 */
function _generateYearOptionsForPosition(selectedYear, availableYears) {
    const currentYear = new Date().getFullYear();
    const years = new Set([...availableYears, currentYear, currentYear + 1]);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    return sortedYears.map(year => 
        `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

// ===== 직책수당 설정 이벤트 핸들러 =====

/**
 * 직책수당 연도 변경
 * @param {string} year - 연도
 */
function changePositionAllowanceYear(year) {
    currentPositionAllowanceYear = Number(year);
    renderSalaryTab(SALARY_TABS.POSITION);
}

/**
 * 새 연도 직책수당 생성
 */
async function createNewPositionYear() {
    const defaultYear = new Date().getFullYear() + 1;
    const yearNum = await showYearSelectModal(defaultYear, '직책수당 생성 연도 선택');
    if (!yearNum) return;
    
    const allowances = SalarySettingsManager.loadPositionAllowances();
    if (allowances[String(yearNum)]) {
        에러처리_인사?.warn(`${yearNum}년 직책수당이 이미 존재합니다.`);
        return;
    }
    
 // 빈 직책수당 생성
    allowances[String(yearNum)] = {};
    SalarySettingsManager.savePositionAllowances(allowances);
    
    currentPositionAllowanceYear = yearNum;
    renderSalaryTab(SALARY_TABS.POSITION);
    에러처리_인사?.success(`${yearNum}년 직책수당이 생성되었습니다.`);
}

/**
 * 전년도 직책수당 복사
 */
function copyPositionFromPrevYear() {
    const prevYear = currentPositionAllowanceYear - 1;
    
    if (!confirm(`${prevYear}년 직책수당을 ${currentPositionAllowanceYear}년으로 복사하시겠습니까?\n\n[주의] 현재 ${currentPositionAllowanceYear}년 데이터는 덮어씌워집니다.`)) {
        return;
    }
    
    try {
        SalarySettingsManager.copyPositionAllowancesFromPrevYear(currentPositionAllowanceYear);
        renderSalaryTab(SALARY_TABS.POSITION);
        에러처리_인사?.success(`${prevYear}년 직책수당이 복사되었습니다.`);
    } catch (error) {
        로거_인사?.error('전년도 직책수당 복사 실패', error);
        에러처리_인사?.warn(error.message);
    }
}

/**
 * 직위 선택 변경 핸들러 (직접 입력 토글)
 * @param {HTMLSelectElement} select - 선택 요소
 */
function onPaPositionSelect(select) {
    const customWrapper = document.getElementById('paCustomInputWrapper');
    const customInput = document.getElementById('paCustomPosition');
    
    if (select.value === '__custom__') {
        customWrapper.style.display = 'block';
        customInput.focus();
    } else {
        customWrapper.style.display = 'none';
        customInput.value = '';
    }
}

/**
 * 직책수당 추가
 */
function addPositionAllowance() {
    const selectEl = document.getElementById('paSelectPosition');
    const customInput = document.getElementById('paCustomPosition');
    const amountInput = document.getElementById('paAddAmount');
    
 // 직위명 결정
    let position = '';
    if (selectEl.value === '__custom__') {
        position = customInput.value.trim();
    } else {
        position = selectEl.value;
    }
    
    if (!position) {
        에러처리_인사?.warn('직위를 선택하거나 입력해주세요.');
        return;
    }
    
 // 금액 파싱
    const amount = _parseNumber(amountInput.value);
    if (!amount || amount <= 0) {
        에러처리_인사?.warn('직책수당 금액을 입력해주세요.');
        amountInput.focus();
        return;
    }
    
 // 저장
    const allowances = SalarySettingsManager.loadPositionAllowances();
    if (!allowances[currentPositionAllowanceYear]) {
        allowances[currentPositionAllowanceYear] = {};
    }
    
 // 이미 존재하는지 확인
    if (allowances[currentPositionAllowanceYear][position]) {
        if (!confirm(`'${position}' 직위의 직책수당이 이미 존재합니다.\n기존 금액을 덮어쓰시겠습니까?`)) {
            return;
        }
    }
    
    allowances[currentPositionAllowanceYear][position] = amount;
    SalarySettingsManager.savePositionAllowances(allowances);
    
 // UI 초기화 및 새로고침
    selectEl.value = '';
    customInput.value = '';
    amountInput.value = '';
    document.getElementById('paCustomInputWrapper').style.display = 'none';
    
    renderSalaryTab(SALARY_TABS.POSITION);
    에러처리_인사?.success(`'${position}' 직책수당이 추가되었습니다.`);
}

/**
 * 직책수당 삭제
 * @param {string} position - 직위명
 */
function deletePositionAllowance(position) {
    if (!confirm(`'${position}' 직책수당을 삭제하시겠습니까?`)) {
        return;
    }
    
    const allowances = SalarySettingsManager.loadPositionAllowances();
    if (allowances[currentPositionAllowanceYear] && allowances[currentPositionAllowanceYear][position]) {
        delete allowances[currentPositionAllowanceYear][position];
        SalarySettingsManager.savePositionAllowances(allowances);
        
        renderSalaryTab(SALARY_TABS.POSITION);
        에러처리_인사?.success(`'${position}' 직책수당이 삭제되었습니다.`);
    }
}

/**
 * 직책수당 입력값 변경 핸들러
 * @param {HTMLInputElement} input - 입력 요소
 */
function onPositionAllowanceChange(input) {
    const value = _parseNumber(input.value);
    input.value = value ? _formatNumber(value) : '';
}

/**
 * 직책수당 입력값 포맷
 * @param {HTMLInputElement} input - 입력 요소
 */
function formatPositionAllowanceInput(input) {
    const value = _parseNumber(input.value);
    input.value = value ? _formatNumber(value) : '';
}

/**
 * 새 직위 추가
 */
function addNewPosition() {
    const input = document.getElementById('newPositionName');
    const positionName = (input?.value || '').trim();
    
    if (!positionName) {
        에러처리_인사?.warn('직위명을 입력하세요.');
        return;
    }
    
 // 현재 연도 데이터에 직위 추가 (금액 0으로)
    const yearData = SalarySettingsManager.getPositionAllowancesByYear(currentPositionAllowanceYear);
    
    if (yearData.hasOwnProperty(positionName)) {
        에러처리_인사?.warn(`'${positionName}' 직위가 이미 존재합니다.`);
        return;
    }
    
    yearData[positionName] = 0;
    SalarySettingsManager.savePositionAllowancesByYear(currentPositionAllowanceYear, yearData);
    
 // 조직 설정에도 추가 (있으면)
    try {
        const orgSettings = localStorage.getItem('orgSettings');
        if (orgSettings) {
            const parsed = JSON.parse(orgSettings);
            if (!parsed.positions) {
                parsed.positions = [];
            }
            if (!parsed.positions.includes(positionName)) {
                parsed.positions.push(positionName);
                localStorage.setItem('orgSettings', JSON.stringify(parsed));
            }
        }
    } catch (e) {
        로거_인사?.warn('조직 설정 업데이트 실패', e);
    }
    
    input.value = '';
    renderSalaryTab(SALARY_TABS.POSITION);
    에러처리_인사?.success(`'${positionName}' 직위가 추가되었습니다.`);
}

/**
 * 직책수당 저장
 */
function savePositionAllowances() {
    try {
        const yearData = {};
        
 // 데이터 수집 (새 UI: .pa-item-input)
        document.querySelectorAll('.pa-item-input').forEach(input => {
            const position = input.dataset.position;
            const value = _parseNumber(input.value);
            
            if (position && value > 0) {
                yearData[position] = value;
            }
        });
        
 // 저장
        SalarySettingsManager.savePositionAllowancesByYear(currentPositionAllowanceYear, yearData);
        에러처리_인사?.success(`${currentPositionAllowanceYear}년 직책수당이 저장되었습니다.`);
        
        로거_인사?.info('직책수당 저장 완료', { year: currentPositionAllowanceYear, count: Object.keys(yearData).length });
        
    } catch (error) {
        로거_인사?.error('직책수당 저장 실패', error);
        에러처리_인사?.warn('직책수당 저장 중 오류가 발생했습니다.');
    }
}

// ===== 통상임금 설정 탭 =====

/**
 * 현재 선택된 통상임금 설정 연도
 * @type {number}
 */
let currentOrdinarySettingsYear = new Date().getFullYear();

/**
 * 통상임금 설정 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderOrdinaryTab() {
    const availableYears = SalarySettingsManager.getOrdinarySettingsYears();
    const yearSettings = SalarySettingsManager.getOrdinarySettingsByYear(currentOrdinarySettingsYear);
    
    const includeHolidayBonus = yearSettings.includeHolidayBonus !== false;
    const includePositionAllowance = yearSettings.includePositionAllowance !== false;
    const includeActingAllowance = yearSettings.includeActingAllowance !== false;
    const holidayBonusMethod = yearSettings.holidayBonusMethod || 'annual';  // 기본값: 연간 고정
    
 // 명절휴가비 비율 계산 (월별 연동 방식용)
    const holidaySettings = SalarySettingsManager.getSettingsByYear(currentOrdinarySettingsYear);
    const holidayBonus = holidaySettings.holidayBonus || {};
    const seolRate = (holidayBonus['설']?.rate || 0.6) * 100;
    const chuseokRate = (holidayBonus['추석']?.rate || 0.6) * 100;
    const monthlyRate = ((seolRate + chuseokRate) / 12).toFixed(1);
    
    return `
        <style>
 /* 통상임금 설정 스타일 */
            .ordinary-year-selector {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px 20px;
                margin-bottom: 24px;
            }
            .ordinary-year-selector .year-select-group {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .ordinary-year-selector label {
                font-weight: 600;
                color: #374151;
                font-size: 14px;
            }
            .ordinary-year-selector select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                min-width: 100px;
                background: white;
            }
            .ordinary-year-selector .year-info {
                margin-top: 10px;
                font-size: 13px;
                color: #6b7280;
            }
            
            .ordinary-info-box {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 16px 20px;
                margin-bottom: 24px;
            }
            .ordinary-info-box .title {
                font-weight: 600;
                color: #1e40af;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .ordinary-info-box .content {
                color: #1e40af;
                font-size: 13px;
                line-height: 1.6;
            }
            .ordinary-info-box .formula {
                background: white;
                padding: 10px 14px;
                border-radius: 6px;
                margin-top: 10px;
                font-family: monospace;
                font-size: 13px;
                color: #374151;
            }
            
            .ordinary-section {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 24px;
            }
            .ordinary-section-header {
                background: #f9fafb;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            .ordinary-section-header h4 {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
                color: #374151;
            }
            .ordinary-section-body {
                padding: 0;
            }
            
            .ordinary-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px 24px;
                border-bottom: 1px solid #f3f4f6;
            }
            .ordinary-item:last-child {
                border-bottom: none;
            }
            .ordinary-item:hover {
                background: #fafbfc;
            }
            .ordinary-item input[type="checkbox"] {
                width: 22px;
                height: 22px;
                margin-top: 2px;
                cursor: pointer;
                accent-color: #4f46e5;
                flex-shrink: 0;
            }
            .ordinary-item-content {
                flex: 1;
            }
            .ordinary-item-label {
                font-weight: 600;
                font-size: 15px;
                color: #1f2937;
                margin-bottom: 6px;
                cursor: pointer;
            }
            .ordinary-item-desc {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.6;
            }
            .ordinary-item-note {
                margin-top: 8px;
                padding: 10px 14px;
                background: #fef3c7;
                border-radius: 6px;
                font-size: 12px;
                color: #92400e;
            }
            .ordinary-item-note.blue {
                background: #dbeafe;
                color: #1e40af;
            }
            
 /* 명절휴가비 산입 방식 선택 스타일 */
            .holiday-bonus-method-section {
                margin-top: 16px;
                padding: 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            }
            .holiday-bonus-method-section .method-title {
                font-weight: 600;
                font-size: 14px;
                color: #374151;
                margin-bottom: 12px;
            }
            .holiday-bonus-method-section .method-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .holiday-bonus-method-section .method-option {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 16px;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .holiday-bonus-method-section .method-option:hover {
                border-color: #93c5fd;
                background: #f0f9ff;
            }
            .holiday-bonus-method-section .method-option.selected {
                border-color: #3b82f6;
                background: #eff6ff;
            }
            .holiday-bonus-method-section .method-option input[type="radio"] {
                width: 18px;
                height: 18px;
                margin-top: 2px;
                accent-color: #3b82f6;
                flex-shrink: 0;
            }
            .holiday-bonus-method-section .method-content {
                flex: 1;
            }
            .holiday-bonus-method-section .method-name {
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 4px;
            }
            .holiday-bonus-method-section .method-desc {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 6px;
            }
            .holiday-bonus-method-section .method-formula {
                font-family: monospace;
                font-size: 12px;
                color: #4b5563;
                background: #f3f4f6;
                padding: 6px 10px;
                border-radius: 4px;
                margin-bottom: 6px;
            }
            .holiday-bonus-method-section .method-example {
                font-size: 12px;
                color: #059669;
            }
            .holiday-bonus-method-section .method-example strong {
                color: #047857;
            }
            
            .ordinary-save-container {
                display: flex;
                justify-content: flex-end;
                padding-top: 8px;
            }
            .ordinary-save-container .btn-primary {
                padding: 12px 28px;
                font-size: 15px;
                font-weight: 600;
            }
        </style>
        
        <!-- 연도 선택 -->
        <div class="ordinary-year-selector">
            <div class="year-select-group">
                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 연도 선택</label>
                <select id="ordinarySettingsYear" onchange="changeOrdinarySettingsYear(this.value)">
                    ${_generateYearOptionsForOrdinary(currentOrdinarySettingsYear, availableYears)}
                </select>
                <button class="btn btn-secondary btn-sm" onclick="createNewOrdinarySettingsYear()">+ 새 연도</button>
                <button class="btn btn-secondary btn-sm" onclick="copyOrdinarySettingsFromPrevYear()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 전년도 복사</button>
            </div>
            <div class="year-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> ${currentOrdinarySettingsYear}년 통상임금 설정
            </div>
        </div>
        
        <!-- 통상임금 안내 -->
        <div class="ordinary-info-box">
            <div class="title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg> 통상임금이란?</div>
            <div class="content">
                정기적, 일률적, 고정적으로 소정근로에 대해 지급되는 임금입니다.<br>
                연장·야간·휴일 근로수당, 연차수당 등의 계산 기준이 됩니다.
            </div>
            <div class="formula">
                통상임금 = 기본급 + 직책수당 + (명절휴가비 ÷ 12)<br>
                시간급 = 통상임금 ÷ 월소정근로시간
            </div>
        </div>
        
        <!-- 포함 항목 설정 -->
        <div class="ordinary-section">
            <div class="ordinary-section-header">
                <h4>통상임금 포함 항목</h4>
            </div>
            <div class="ordinary-section-body">
                <!-- 명절휴가비 -->
                <div class="ordinary-item">
                    <input type="checkbox" id="includeHolidayBonus" ${includeHolidayBonus ? 'checked' : ''} onchange="toggleHolidayBonusMethod()">
                    <div class="ordinary-item-content">
                        <label class="ordinary-item-label" for="includeHolidayBonus"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> 명절휴가비</label>
                        <div class="ordinary-item-desc">
                            설·추석에 지급되는 명절휴가비를 통상임금에 포함합니다.<br>
                            연간 총액을 12개월로 나누어 월 통상임금에 산입됩니다.
                        </div>
                        <div class="ordinary-item-note blue">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>1년 만근 가정</strong>: 대법원 판결(2020다247190)에 따라 중도입사자도 입사 전 명절휴가비를 포함하여 계산합니다.
                        </div>
                        
                        <!-- 명절휴가비 산입 방식 선택 -->
                        <div class="holiday-bonus-method-section" id="holidayBonusMethodSection" style="${includeHolidayBonus ? '' : 'display:none;'}">
                            <div class="method-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 산입 방식 선택</div>
                            <div class="method-options">
                                <label class="method-option ${holidayBonusMethod === 'annual' ? 'selected' : ''}">
                                    <input type="radio" name="holidayBonusMethod" value="annual" ${holidayBonusMethod === 'annual' ? 'checked' : ''} onchange="updateMethodSelection()">
                                    <div class="method-content">
                                        <div class="method-name">연간 고정</div>
                                        <div class="method-desc">설/추석 시점 기본급으로 계산 → 12로 나눔 → 매월 같은 금액</div>
                                        <div class="method-formula">(설 기본급×${seolRate}% + 추석 기본급×${chuseokRate}%) ÷ 12</div>
                                        <div class="method-example">예) 4월에 호봉 올라도 명절휴가비 반영분 <strong>동일</strong></div>
                                    </div>
                                </label>
                                <label class="method-option ${holidayBonusMethod === 'monthly' ? 'selected' : ''}">
                                    <input type="radio" name="holidayBonusMethod" value="monthly" ${holidayBonusMethod === 'monthly' ? 'checked' : ''} onchange="updateMethodSelection()">
                                    <div class="method-content">
                                        <div class="method-name">월별 연동</div>
                                        <div class="method-desc">해당 월 기본급 기준으로 계산 → 기본급 오르면 같이 오름</div>
                                        <div class="method-formula">해당 월 기본급 × ${monthlyRate}%</div>
                                        <div class="method-example">예) 4월에 호봉 오르면 명절휴가비 반영분도 <strong>인상</strong></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 직책수당 -->
                <div class="ordinary-item">
                    <input type="checkbox" id="includePositionAllowance" ${includePositionAllowance ? 'checked' : ''}>
                    <div class="ordinary-item-content">
                        <label class="ordinary-item-label" for="includePositionAllowance"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 직책수당</label>
                        <div class="ordinary-item-desc">
                            직위(팀장, 과장 등)에 따라 지급되는 직책수당을 통상임금에 포함합니다.
                        </div>
                        <div class="ordinary-item-note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <strong>중도입사자 월할 계산</strong>: 실제 해당 직위를 수행한 개월수만 반영됩니다.<br>
                            예: 3월 입사자 → 연간 10개월분만 포함 (직책수당 × 10/12)
                        </div>
                    </div>
                </div>
                
                <!-- 직무대리 직책수당 -->
                <div class="ordinary-item">
                    <input type="checkbox" id="includeActingAllowance" ${includeActingAllowance ? 'checked' : ''}>
                    <div class="ordinary-item-content">
                        <label class="ordinary-item-label" for="includeActingAllowance"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> 직무대리 직책수당</label>
                        <div class="ordinary-item-desc">
                            직무대리 기간 동안 해당 직위의 직책수당을 통상임금에 포함합니다.<br>
                            (겸직은 본직에서 이미 지급하므로 미포함)
                        </div>
                        <div class="ordinary-item-note blue">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>해당 월 기간 존재 시 전액 포함</strong>: 해당 월에 직무대리 기간이 하루라도 있으면 해당 직위 직책수당 100%가 통상임금에 포함됩니다.
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 저장 버튼 -->
        <div class="ordinary-save-container">
            <button class="btn btn-primary" onclick="saveOrdinarySettings()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 설정 저장</button>
        </div>
    `;
}

/**
 * 통상임금 설정 연도 옵션 생성
 * @private
 */
function _generateYearOptionsForOrdinary(selectedYear, availableYears) {
    const currentYear = new Date().getFullYear();
    const years = new Set([...availableYears, currentYear, currentYear + 1]);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    return sortedYears.map(year => 
        `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

// ===== 통상임금 설정 이벤트 핸들러 =====

/**
 * 통상임금 설정 연도 변경
 * @param {string} year - 연도
 */
function changeOrdinarySettingsYear(year) {
    currentOrdinarySettingsYear = Number(year);
    renderSalaryTab(SALARY_TABS.ORDINARY);
}

/**
 * 새 연도 통상임금 설정 생성
 */
async function createNewOrdinarySettingsYear() {
    const defaultYear = new Date().getFullYear() + 1;
    const yearNum = await showYearSelectModal(defaultYear, '통상임금 설정 연도 선택');
    if (!yearNum) return;
    
    const existing = SalarySettingsManager.getOrdinarySettingsByYear(yearNum);
 // 기존 설정이 있는지 확인 (기본값과 다른지)
    const settings = SalarySettingsManager.loadOrdinarySettings();
    if (settings[String(yearNum)]) {
        에러처리_인사?.warn(`${yearNum}년 설정이 이미 존재합니다.`);
        return;
    }
    
 // 기본값으로 생성
    SalarySettingsManager.saveOrdinarySettingsByYear(yearNum, {
        includeHolidayBonus: true,
        includePositionAllowance: true,
        includeActingAllowance: true,
        monthlyHoursRounding: 'round',  // 기본값: 반올림
        hourlyWageRounding: {           // 기본값: 소수점 유지
            type: 'decimal',
            unit: 1,
            method: 'floor'
        },
        overtimeRounding: {             // 기본값: 10원 단위 반올림
            unit: 10,
            method: 'round'
        }
    });
    
    currentOrdinarySettingsYear = yearNum;
    renderSalaryTab(SALARY_TABS.ORDINARY);
    에러처리_인사?.success(`${yearNum}년 통상임금 설정이 생성되었습니다.`);
}

/**
 * 전년도 통상임금 설정 복사
 */
function copyOrdinarySettingsFromPrevYear() {
    const prevYear = currentOrdinarySettingsYear - 1;
    const settings = SalarySettingsManager.loadOrdinarySettings();
    
    if (!settings[String(prevYear)]) {
        에러처리_인사?.warn(`${prevYear}년 설정이 없습니다.`);
        return;
    }
    
    if (!confirm(`${prevYear}년 설정을 ${currentOrdinarySettingsYear}년으로 복사하시겠습니까?`)) {
        return;
    }
    
    const prevSettings = settings[String(prevYear)];
    SalarySettingsManager.saveOrdinarySettingsByYear(currentOrdinarySettingsYear, {
        includeHolidayBonus: prevSettings.includeHolidayBonus,
        includePositionAllowance: prevSettings.includePositionAllowance,
        includeActingAllowance: prevSettings.includeActingAllowance,
        monthlyHoursRounding: prevSettings.monthlyHoursRounding || 'round',
        hourlyWageRounding: prevSettings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor', applyTiming: 'after' },
        overtimeRounding: prevSettings.overtimeRounding || { unit: 10, method: 'round' }
    });
    
    renderSalaryTab(SALARY_TABS.ORDINARY);
    에러처리_인사?.success(`${prevYear}년 → ${currentOrdinarySettingsYear}년 복사 완료`);
}

/**
 * 통상임금 설정 저장
 */
function saveOrdinarySettings() {
    try {
        const includeHolidayBonus = document.getElementById('includeHolidayBonus')?.checked ?? true;
        const includePositionAllowance = document.getElementById('includePositionAllowance')?.checked ?? true;
        const includeActingAllowance = document.getElementById('includeActingAllowance')?.checked ?? true;
        
 // 명절휴가비 산입 방식 (연간 고정 / 월별 연동)
        const holidayBonusMethodRadio = document.querySelector('input[name="holidayBonusMethod"]:checked');
        const holidayBonusMethod = holidayBonusMethodRadio?.value || 'annual';
        
 // 기존 설정 로드 (monthlyHoursRounding, overtimeRounding 등 유지)
        const existingSettings = SalarySettingsManager.getOrdinarySettingsByYear(currentOrdinarySettingsYear);
        
        SalarySettingsManager.saveOrdinarySettingsByYear(currentOrdinarySettingsYear, {
            ...existingSettings,  // 기존 설정 유지
            includeHolidayBonus,
            includePositionAllowance,
            includeActingAllowance,
            holidayBonusMethod
        });
        
        에러처리_인사?.success(`${currentOrdinarySettingsYear}년 통상임금 설정이 저장되었습니다.`);
        로거_인사?.info('통상임금 설정 저장', { 
            year: currentOrdinarySettingsYear, 
            includeHolidayBonus, 
            includePositionAllowance, 
            includeActingAllowance,
            holidayBonusMethod
        });
        
    } catch (error) {
        로거_인사?.error('통상임금 설정 저장 실패', error);
        에러처리_인사?.warn('설정 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 명절휴가비 체크박스 토글 시 산입 방식 섹션 표시/숨김
 */
function toggleHolidayBonusMethod() {
    const isChecked = document.getElementById('includeHolidayBonus')?.checked;
    const methodSection = document.getElementById('holidayBonusMethodSection');
    if (methodSection) {
        methodSection.style.display = isChecked ? '' : 'none';
    }
}

/**
 * 산입 방식 라디오 버튼 선택 시 스타일 업데이트
 */
function updateMethodSelection() {
    const options = document.querySelectorAll('.holiday-bonus-method-section .method-option');
    options.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        option.classList.toggle('selected', radio?.checked);
    });
}

// ===== 명절휴가비 설정 탭 =====

/**
 * 현재 선택된 명절휴가비 연도
 * @type {number}
 */
let currentHolidayBonusYear = new Date().getFullYear();

/**
 * 명절휴가비 설정 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderHolidayTab() {
    const yearSettings = SalarySettingsManager.getSettingsByYear(currentHolidayBonusYear);
    const holidayBonus = yearSettings.holidayBonus || {
        "설": { holidayDate: "", rate: 0.6 },
        "추석": { holidayDate: "", rate: 0.6 }
    };
    
 // 등록된 연도 목록
    const settings = SalarySettingsManager.loadSettings();
    const availableYears = Object.keys(settings).map(Number).sort((a, b) => b - a);
    
    return `
        <style>
 /* ===== 명절휴가비 설정 스타일 ===== */
            .hb-container {
                max-width: 900px;
                margin: 0 auto;
            }
            
 /* 연도 선택 영역 */
            .hb-year-section {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border-radius: 16px;
                padding: 24px 28px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
            }
            .hb-year-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .hb-year-title h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #92400e;
            }
            .hb-year-controls {
                display: flex;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }
            .hb-year-select-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
                background: white;
                padding: 8px 16px;
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            }
            .hb-year-select-wrapper label {
                font-weight: 600;
                color: #78350f;
                font-size: 15px;
                white-space: nowrap;
            }
            .hb-year-select-wrapper select {
                padding: 10px 36px 10px 16px;
                font-size: 18px;
                font-weight: 700;
                border: 2px solid #fbbf24;
                border-radius: 8px;
                background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2392400e' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 8px center;
                background-size: 20px;
                appearance: none;
                cursor: pointer;
                color: #92400e;
                min-width: 140px;
            }
            .hb-year-select-wrapper select:focus {
                outline: none;
                border-color: #d97706;
                box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.3);
            }
            .hb-year-btn {
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 600;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .hb-year-btn-new {
                background: #92400e;
                color: white;
            }
            .hb-year-btn-new:hover {
                background: #78350f;
                transform: translateY(-1px);
            }
            
 /* 안내 박스 */
            .hb-info-box {
                background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                border: 1px solid #fcd34d;
                border-radius: 12px;
                padding: 16px 20px;
                margin-bottom: 24px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .hb-info-box .info-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            .hb-info-box .info-text {
                font-size: 14px;
                color: #78350f;
                line-height: 1.6;
            }
            .hb-info-box .info-text strong {
                color: #92400e;
            }
            
 /* 명절 카드 그리드 */
            .hb-cards-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 24px;
                margin-bottom: 24px;
            }
            @media (max-width: 700px) {
                .hb-cards-grid {
                    grid-template-columns: 1fr;
                }
            }
            
 /* 명절 카드 */
            .hb-card {
                background: white;
                border-radius: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .hb-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.12);
            }
            .hb-card-header {
                padding: 20px 24px;
                display: flex;
                align-items: center;
                gap: 14px;
            }
            .hb-card-header.seol {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            }
            .hb-card-header.chuseok {
                background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
            }
            .hb-card-icon {
                width: 48px;
                height: 48px;
                background: rgba(255,255,255,0.25);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
            }
            .hb-card-title {
                color: white;
            }
            .hb-card-title h4 {
                margin: 0 0 4px 0;
                font-size: 22px;
                font-weight: 700;
            }
            .hb-card-title span {
                font-size: 13px;
                opacity: 0.9;
            }
            
 /* 카드 바디 */
            .hb-card-body {
                padding: 24px;
            }
            .hb-field {
                margin-bottom: 20px;
            }
            .hb-field:last-child {
                margin-bottom: 0;
            }
            .hb-field-label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }
            .hb-field-label label {
                font-weight: 600;
                color: #374151;
                font-size: 14px;
            }
            .hb-field-label .required {
                color: #dc2626;
            }
            .hb-field input[type="date"] {
                width: 100%;
                padding: 14px 16px;
                font-size: 16px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                transition: all 0.2s;
            }
            .hb-field input[type="date"]:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
            }
            .hb-field-hint {
                display: block;
                font-size: 12px;
                color: #9ca3af;
                margin-top: 6px;
            }
            
 /* 비율 입력 */
            .hb-rate-group {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .hb-rate-input {
                width: 120px;
                padding: 14px 16px;
                font-size: 20px;
                font-weight: 700;
                text-align: center;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                transition: all 0.2s;
            }
            .hb-rate-input:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
            }
            .hb-rate-unit {
                font-size: 24px;
                font-weight: 700;
                color: #6b7280;
            }
            .hb-rate-preview {
                margin-left: auto;
                padding: 8px 14px;
                background: #fef3c7;
                border-radius: 8px;
                font-size: 13px;
                color: #92400e;
            }
            
 /* 통상임금 안내 섹션 */
            .hb-ordinary-section {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 1px solid #86efac;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
            }
            .hb-ordinary-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .hb-ordinary-title h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 700;
                color: #166534;
            }
            .hb-ordinary-content {
                color: #166534;
                font-size: 14px;
                line-height: 1.7;
            }
            .hb-ordinary-content p {
                margin: 0 0 12px 0;
            }
            .hb-ordinary-list {
                margin: 0;
                padding-left: 20px;
            }
            .hb-ordinary-list li {
                margin-bottom: 6px;
            }
            .hb-ordinary-note {
                margin-top: 12px;
                padding: 12px 16px;
                background: rgba(255,255,255,0.6);
                border-radius: 8px;
                font-size: 13px;
                color: #15803d;
            }
            
 /* 저장 버튼 */
            .hb-save-section {
                text-align: center;
                padding: 20px 0;
            }
            .hb-save-btn {
                padding: 16px 48px;
                font-size: 16px;
                font-weight: 700;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
            .hb-save-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            }
        </style>
        
        <div class="hb-container">
            <!-- 연도 선택 영역 -->
            <div class="hb-year-section">
                <div class="hb-year-title">
                    <span style="font-size:28px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span>
                    <h3>명절휴가비 설정</h3>
                </div>
                <div class="hb-year-controls">
                    <div class="hb-year-select-wrapper">
                        <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 연도</label>
                        <select id="holidayBonusYear" onchange="changeHolidayBonusYear(this.value)">
                            ${_generateYearOptionsForHoliday(currentHolidayBonusYear, availableYears)}
                        </select>
                    </div>
                    <button class="hb-year-btn hb-year-btn-new" onclick="createNewHolidayYear()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 새 연도 추가
                    </button>
                </div>
            </div>
            
            <!-- 안내 박스 -->
            <div class="hb-info-box">
                <span class="info-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span class="info-text">
                    명절휴가비는 <strong>명절 당일 재직 여부</strong>로 지급이 결정됩니다. 
                    호봉제는 기본급 × 비율, 연봉제는 직급 설정에 따라 비율 또는 정액으로 계산됩니다.
                </span>
            </div>
            
            <!-- 명절 카드 그리드 -->
            <div class="hb-cards-grid">
                <!-- 설 -->
                <div class="hb-card">
                    <div class="hb-card-header seol">
                        <div class="hb-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
                        <div class="hb-card-title">
                            <h4>설</h4>
                            <span>음력 1월 1일</span>
                        </div>
                    </div>
                    <div class="hb-card-body">
                        <div class="hb-field">
                            <div class="hb-field-label">
                                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 명절 날짜 (양력)</label>
                            </div>
                            <input type="date" 
                                id="holidayDate_설" 
                                value="${holidayBonus['설']?.holidayDate || ''}"
                                onchange="onHolidayFieldChange()">
                            <span class="hb-field-hint">해당 연도의 설날을 양력으로 입력하세요</span>
                        </div>
                        <div class="hb-field">
                            <div class="hb-field-label">
                                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 지급 비율</label>
                            </div>
                            <div class="hb-rate-group">
                                <input type="number" 
                                    class="hb-rate-input"
                                    id="holidayRate_설" 
                                    value="${(holidayBonus['설']?.rate || 0.6) * 100}"
                                    min="0" max="200" step="10"
                                    onchange="onHolidayFieldChange()">
                                <span class="hb-rate-unit">%</span>
                                <span class="hb-rate-preview">기본급의 ${(holidayBonus['설']?.rate || 0.6) * 100}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 추석 -->
                <div class="hb-card">
                    <div class="hb-card-header chuseok">
                        <div class="hb-card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
                        <div class="hb-card-title">
                            <h4>추석</h4>
                            <span>음력 8월 15일</span>
                        </div>
                    </div>
                    <div class="hb-card-body">
                        <div class="hb-field">
                            <div class="hb-field-label">
                                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 명절 날짜 (양력)</label>
                            </div>
                            <input type="date" 
                                id="holidayDate_추석" 
                                value="${holidayBonus['추석']?.holidayDate || ''}"
                                onchange="onHolidayFieldChange()">
                            <span class="hb-field-hint">해당 연도의 추석을 양력으로 입력하세요</span>
                        </div>
                        <div class="hb-field">
                            <div class="hb-field-label">
                                <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 지급 비율</label>
                            </div>
                            <div class="hb-rate-group">
                                <input type="number" 
                                    class="hb-rate-input"
                                    id="holidayRate_추석" 
                                    value="${(holidayBonus['추석']?.rate || 0.6) * 100}"
                                    min="0" max="200" step="10"
                                    onchange="onHolidayFieldChange()">
                                <span class="hb-rate-unit">%</span>
                                <span class="hb-rate-preview">기본급의 ${(holidayBonus['추석']?.rate || 0.6) * 100}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 통상임금 산입 안내 -->
            <div class="hb-ordinary-section">
                <div class="hb-ordinary-title">
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span>
                    <h4>통상임금 산입 기준</h4>
                </div>
                <div class="hb-ordinary-content">
                    <p>대법원 판결(2020다247190)에 따라 명절휴가비는 <strong>1년 만근을 가정</strong>하여 통상임금에 산입됩니다.</p>
                    <ul class="hb-ordinary-list">
                        <li><strong>호봉제:</strong> (설 당일 월 기본급 × 비율) + (추석 당일 월 기본급 × 비율) ÷ 12</li>
                        <li><strong>연봉제(비율):</strong> 위와 동일</li>
                        <li><strong>연봉제(정액):</strong> (설 정액 + 추석 정액) ÷ 12</li>
                    </ul>
                    <div class="hb-ordinary-note">
                        ※ 실제 지급은 명절 당일 재직 여부로 판단하지만, 통상임금 계산 시에는 1년 만근을 가정합니다.
                    </div>
                </div>
            </div>
            
            <!-- 저장 버튼 -->
            <div class="hb-save-section">
                <button class="hb-save-btn" onclick="saveHolidayBonus()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 명절휴가비 설정 저장
                </button>
            </div>
        </div>
    `;
}

/**
 * 명절휴가비 연도 옵션 생성
 * @private
 */
function _generateYearOptionsForHoliday(selectedYear, availableYears) {
    const currentYear = new Date().getFullYear();
    const years = new Set([...availableYears, currentYear, currentYear + 1]);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    return sortedYears.map(year => 
        `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

// ===== 명절휴가비 설정 이벤트 핸들러 =====

/**
 * 명절휴가비 연도 변경
 * @param {string} year - 연도
 */
function changeHolidayBonusYear(year) {
    currentHolidayBonusYear = Number(year);
    renderSalaryTab(SALARY_TABS.HOLIDAY);
}

/**
 * 새 연도 명절휴가비 설정 생성
 */
async function createNewHolidayYear() {
    const defaultYear = new Date().getFullYear() + 1;
    const yearNum = await showYearSelectModal(defaultYear, '명절휴가비 설정 연도 선택');
    if (!yearNum) return;
    
    const settings = SalarySettingsManager.loadSettings();
    if (settings[String(yearNum)]) {
 // 이미 존재하면 해당 연도로 이동만
        currentHolidayBonusYear = yearNum;
        renderSalaryTab(SALARY_TABS.HOLIDAY);
        return;
    }
    
 // 기본 설정 생성
    settings[String(yearNum)] = {
        maxRank: 31,
        holidayBonus: {
            "설": { holidayDate: "", rate: 0.6 },
            "추석": { holidayDate: "", rate: 0.6 }
        }
    };
    SalarySettingsManager.saveSettings(settings);
    
    currentHolidayBonusYear = yearNum;
    renderSalaryTab(SALARY_TABS.HOLIDAY);
    에러처리_인사?.success(`${yearNum}년 명절휴가비 설정이 생성되었습니다.`);
}

/**
 * 명절휴가비 필드 변경 핸들러
 */
function onHolidayFieldChange() {
 // 실시간 저장 없이 저장 버튼으로 일괄 저장
 // 필요시 여기에 유효성 검증 추가 가능
}

/**
 * 명절휴가비 설정 저장
 */
function saveHolidayBonus() {
    try {
 // 설 데이터
        const seolDate = document.getElementById('holidayDate_설')?.value || '';
        const seolRateInput = document.getElementById('holidayRate_설')?.value;
        const seolRate = seolRateInput ? Number(seolRateInput) / 100 : 0.6;
        
 // 추석 데이터
        const chuseokDate = document.getElementById('holidayDate_추석')?.value || '';
        const chuseokRateInput = document.getElementById('holidayRate_추석')?.value;
        const chuseokRate = chuseokRateInput ? Number(chuseokRateInput) / 100 : 0.6;
        
 // 유효성 검증
        if (seolRate < 0 || seolRate > 2) {
            에러처리_인사?.warn('설 지급 비율은 0~200% 사이여야 합니다.');
            return;
        }
        if (chuseokRate < 0 || chuseokRate > 2) {
            에러처리_인사?.warn('추석 지급 비율은 0~200% 사이여야 합니다.');
            return;
        }
        
 // 현재 연도 설정 가져오기
        const yearSettings = SalarySettingsManager.getSettingsByYear(currentHolidayBonusYear);
        
 // 명절휴가비 설정 업데이트
        yearSettings.holidayBonus = {
            "설": {
                holidayDate: seolDate,
                rate: seolRate
            },
            "추석": {
                holidayDate: chuseokDate,
                rate: chuseokRate
            }
        };
        
 // 저장
        SalarySettingsManager.saveSettingsByYear(currentHolidayBonusYear, yearSettings);
        
        에러처리_인사?.success(`${currentHolidayBonusYear}년 명절휴가비 설정이 저장되었습니다.`);
        로거_인사?.info('명절휴가비 설정 저장 완료', { 
            year: currentHolidayBonusYear, 
            설: { date: seolDate, rate: seolRate },
            추석: { date: chuseokDate, rate: chuseokRate }
        });
        
    } catch (error) {
        로거_인사?.error('명절휴가비 설정 저장 실패', error);
        에러처리_인사?.warn('명절휴가비 설정 저장 중 오류가 발생했습니다.');
    }
}

// ===== 유틸리티 =====

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

// ===== 기존 데이터에서 직급 불러오기 =====

/**
 * 기존 직원 데이터에서 직급 불러오기
 * 
 * @description
 * 등록된 직원들의 발령 정보에서 직급(grade)과 급여방식(isRankBased)을 추출하여
 * 호봉제/연봉제 직급으로 자동 분류하여 추가합니다.
 * 이미 등록된 직급은 건너뜁니다.
 */
function importGradesFromEmployees() {
    try {
        const targetYear = currentGradeYear;
        const yearStart = `${targetYear}-01-01`;
        const yearEnd = `${targetYear}-12-31`;
        
        로거_인사?.info('기존 직원 데이터에서 직급 불러오기 시작', { targetYear });
        
 // 전체 직원 데이터 로드 (db 구조에 따라 다르게 접근)
        let employees = [];
        if (typeof db !== 'undefined') {
            if (db.data && Array.isArray(db.data.employees)) {
                employees = db.data.employees;
            } else if (typeof db.employees?.getAll === 'function') {
                employees = db.employees.getAll();
            } else if (Array.isArray(db.employees)) {
                employees = db.employees;
            }
        }
        
        if (!employees || employees.length === 0) {
            에러처리_인사?.warn('등록된 직원이 없습니다.');
            return;
        }
        
 /**
 * 해당 연도에 근무했는지 확인
 * @param {Object} emp - 직원 정보
 * @param {Object} assign - 발령 정보
 * @returns {boolean}
 */
        function isWorkedInYear(emp, assign) {
 // 발령 시작일이 연도 끝 이후면 해당 안됨
            const startDate = assign.startDate || emp.employment?.startDate;
            if (startDate && startDate > yearEnd) return false;
            
 // 발령 종료일이 연도 시작 이전이면 해당 안됨
            const endDate = assign.endDate;
            if (endDate && endDate < yearStart) return false;
            
 // 퇴사일이 연도 시작 이전이면 해당 안됨
            const retirementDate = emp.employment?.retirementDate;
            if (retirementDate && retirementDate < yearStart) return false;
            
            return true;
        }
        
 // 직급 정보 수집 (grade -> isRankBased 매핑)
        const gradeMap = new Map(); // key: 직급명, value: { isRankBased, count }
        let filteredEmployeeCount = 0;
        
        employees.forEach(emp => {
 // 현재 발령 정보에서 직급 추출
            const assignments = emp.assignments || [];
            let hasValidAssignment = false;
            
            assignments.forEach(assign => {
 // 해당 연도에 근무했는지 확인
                if (!isWorkedInYear(emp, assign)) return;
                
                const grade = assign.grade;
                if (!grade) return;
                
                hasValidAssignment = true;
                
 // isRankBased 결정: 발령 정보 > salaryInfo > rank 순
                let isRankBased = assign.isRankBased;
                if (isRankBased === undefined) {
                    isRankBased = emp.salaryInfo?.isRankBased;
                }
                if (isRankBased === undefined) {
                    isRankBased = emp.rank?.isRankBased;
                }
                if (isRankBased === undefined) {
 // 기본값: startRank이 있으면 호봉제로 추정
                    isRankBased = !!emp.rank?.startRank;
                }
                
 // 이미 수집된 직급이면 카운트만 증가
                if (gradeMap.has(grade)) {
                    const existing = gradeMap.get(grade);
                    existing.count++;
 // 더 많이 사용된 방식으로 업데이트
                    if (isRankBased !== existing.isRankBased) {
 // 충돌 시 현재 값 유지 (첫 번째 발견된 값)
                    }
                } else {
                    gradeMap.set(grade, { isRankBased: !!isRankBased, count: 1 });
                }
            });
            
            if (hasValidAssignment) {
                filteredEmployeeCount++;
            }
            
 // 발령이 없는 경우 currentPosition에서 추출 (입사일 기준으로 판단)
            if (assignments.length === 0 && emp.currentPosition?.grade) {
                const startDate = emp.employment?.startDate;
                const retirementDate = emp.employment?.retirementDate;
                
 // 입사일이 연도 끝 이후거나, 퇴사일이 연도 시작 이전이면 스킵
                if (startDate && startDate > yearEnd) return;
                if (retirementDate && retirementDate < yearStart) return;
                
                const grade = emp.currentPosition.grade;
                let isRankBased = emp.salaryInfo?.isRankBased ?? emp.rank?.isRankBased ?? !!emp.rank?.startRank;
                
                if (!gradeMap.has(grade)) {
                    gradeMap.set(grade, { isRankBased: !!isRankBased, count: 1 });
                }
                filteredEmployeeCount++;
            }
        });
        
        if (gradeMap.size === 0) {
            에러처리_인사?.warn(`${targetYear}년에 근무한 직원의 직급이 없습니다.`);
            return;
        }
        
 // 기존 등록된 직급 로드
        const existingData = SalarySettingsManager.loadGrades();
        const existingRankNames = new Set((existingData.rankGrades || []).map(g => g.name));
        const existingSalaryNames = new Set((existingData.salaryGrades || []).map(g => g.name));
        
 // 분류 및 추가
        let addedRank = 0;
        let addedSalary = 0;
        let skipped = 0;
        
        gradeMap.forEach((info, gradeName) => {
            if (info.isRankBased) {
 // 호봉제 직급
                if (existingRankNames.has(gradeName)) {
                    skipped++;
                    로거_인사?.debug('이미 등록된 호봉제 직급', { name: gradeName });
                } else {
                    SalarySettingsManager.addRankGrade(gradeName);
                    existingRankNames.add(gradeName);
                    addedRank++;
                    로거_인사?.debug('호봉제 직급 추가', { name: gradeName });
                }
            } else {
 // 연봉제 직급
                if (existingSalaryNames.has(gradeName)) {
                    skipped++;
                    로거_인사?.debug('이미 등록된 연봉제 직급', { name: gradeName });
                } else {
                    SalarySettingsManager.addSalaryGrade(gradeName, 'percent'); // 기본: 비율
                    existingSalaryNames.add(gradeName);
                    addedSalary++;
                    로거_인사?.debug('연봉제 직급 추가', { name: gradeName });
                }
            }
        });
        
 // 결과 메시지
        const totalAdded = addedRank + addedSalary;
        if (totalAdded > 0) {
            에러처리_인사?.success(
                `${targetYear}년 직급 불러오기 완료 (${filteredEmployeeCount}명 대상)\n` +
                `호봉제 ${addedRank}개, 연봉제 ${addedSalary}개 추가됨` +
                (skipped > 0 ? ` (이미 등록된 ${skipped}개 건너뜀)` : '')
            );
            
 // 탭 새로고침
            renderSalaryTab('grades');
        } else {
            에러처리_인사?.info(`${targetYear}년 기준 추가할 새로운 직급이 없습니다.`);
        }
        
        로거_인사?.info('기존 직원 데이터에서 직급 불러오기 완료', {
            targetYear,
            filteredEmployeeCount,
            total: gradeMap.size,
            addedRank,
            addedSalary,
            skipped
        });
        
    } catch (error) {
        로거_인사?.error('직급 불러오기 실패', error);
        에러처리_인사?.handle(error, '직급 불러오기 중 오류가 발생했습니다.');
    }
}

/**
 * 직급 일괄 삭제
 * @param {string} type - 'rank' (호봉제), 'salary' (연봉제), 'all' (모두)
 */
/**
 * 직급 일괄 삭제
 * @param {string} type - 'rank' (호봉제), 'salary' (연봉제), 'all' (모두)
 */
async function deleteAllGrades(type) {
    try {
        const data = SalarySettingsManager.loadGrades();
        const rankCount = data.rankGrades?.length || 0;
        const salaryCount = data.salaryGrades?.length || 0;
        
        let message = '';
        let targetCount = 0;
        
        switch (type) {
            case 'rank':
                if (rankCount === 0) {
                    에러처리_인사?.info('삭제할 호봉제 직급이 없습니다.');
                    return;
                }
                message = `호봉제 직급 ${rankCount}개`;
                targetCount = rankCount;
                break;
            case 'salary':
                if (salaryCount === 0) {
                    에러처리_인사?.info('삭제할 연봉제 직급이 없습니다.');
                    return;
                }
                message = `연봉제 직급 ${salaryCount}개`;
                targetCount = salaryCount;
                break;
            case 'all':
                if (rankCount === 0 && salaryCount === 0) {
                    에러처리_인사?.info('삭제할 직급이 없습니다.');
                    return;
                }
                message = `모든 직급 (호봉제 ${rankCount}개, 연봉제 ${salaryCount}개)`;
                targetCount = rankCount + salaryCount;
                break;
            default:
                return;
        }
        
 // 삭제 확인 모달
        const confirmed = await showDeleteConfirmModal(
            `${currentGradeYear}년 ${message} 삭제`,
            `${message}을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
        );
        
        if (!confirmed) {
            에러처리_인사?.info('삭제가 취소되었습니다.');
            return;
        }
        
 // 삭제 실행
        let deletedRank = 0;
        let deletedSalary = 0;
        
        if (type === 'rank' || type === 'all') {
            deletedRank = data.rankGrades?.length || 0;
            data.rankGrades = [];
        }
        
        if (type === 'salary' || type === 'all') {
            deletedSalary = data.salaryGrades?.length || 0;
            data.salaryGrades = [];
        }
        
 // 저장
        SalarySettingsManager.saveGrades(data);
        
 // UI 새로고침
        renderSalaryTab('grades');
        
 // 결과 메시지
        if (type === 'all') {
            에러처리_인사?.success(`모든 직급 삭제 완료: 호봉제 ${deletedRank}개, 연봉제 ${deletedSalary}개`);
        } else if (type === 'rank') {
            에러처리_인사?.success(`호봉제 직급 ${deletedRank}개 삭제 완료`);
        } else {
            에러처리_인사?.success(`연봉제 직급 ${deletedSalary}개 삭제 완료`);
        }
        
        로거_인사?.info('직급 일괄 삭제', { year: currentGradeYear, type, deletedRank, deletedSalary });
        
    } catch (error) {
        로거_인사?.error('직급 일괄 삭제 실패', error);
        에러처리_인사?.handle(error, '직급 삭제 중 오류가 발생했습니다.');
    }
}

// ===== 수당 계산 설정 탭 =====

/**
 * 현재 선택된 수당 계산 설정 연도
 * @type {number}
 */
let currentCalculationSettingsYear = new Date().getFullYear();

/**
 * 수당 계산 설정 탭 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderCalculationTab() {
    const availableYears = SalarySettingsManager.getOrdinarySettingsYears();
    const yearSettings = SalarySettingsManager.getOrdinarySettingsByYear(currentCalculationSettingsYear);
    
    const monthlyHoursRounding = yearSettings.monthlyHoursRounding || 'round';
    const hourlyWageRounding = yearSettings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor', applyTiming: 'after' };
    const overtimeRounding = yearSettings.overtimeRounding || { unit: 10, method: 'round' };
    
    return `
        <style>
 /* 수당 계산 설정 스타일 */
            .calc-container {
                max-width: 900px;
                margin: 0 auto;
            }
            
            .calc-year-selector {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px 20px;
                margin-bottom: 24px;
            }
            .calc-year-selector .year-select-group {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .calc-year-selector label {
                font-weight: 600;
                color: #374151;
                font-size: 14px;
            }
            .calc-year-selector select {
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                min-width: 100px;
                background: white;
            }
            .calc-year-selector .year-info {
                margin-top: 10px;
                font-size: 13px;
                color: #6b7280;
            }
            
            .calc-section {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 24px;
            }
            .calc-section-header {
                background: #f9fafb;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            .calc-section-header h4 {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
                color: #374151;
            }
            .calc-section-body {
                padding: 20px 24px;
            }
            
            .calc-item-desc {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.6;
                margin-bottom: 16px;
            }
            .calc-item-desc strong {
                color: #374151;
            }
            
            .calc-note {
                margin-top: 12px;
                padding: 12px 16px;
                background: #dbeafe;
                border-radius: 8px;
                font-size: 13px;
                color: #1e40af;
                line-height: 1.5;
            }
            .calc-note.yellow {
                background: #fef3c7;
                color: #92400e;
            }
            
 /* 라디오 버튼 그룹 */
            .calc-radio-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .calc-radio-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .calc-radio-item:hover {
                background: #f3f4f6;
                border-color: #d1d5db;
            }
            .calc-radio-item.selected {
                background: #eff6ff;
                border-color: #3b82f6;
            }
            .calc-radio-item input[type="radio"] {
                width: 18px;
                height: 18px;
                accent-color: #3b82f6;
                cursor: pointer;
            }
            .calc-radio-label {
                font-size: 14px;
                font-weight: 500;
                color: #374151;
            }
            .calc-radio-example {
                font-size: 12px;
                color: #6b7280;
                margin-left: auto;
            }
            
 /* 시간외수당 옵션 그룹 */
            .overtime-options {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-top: 16px;
            }
            @media (max-width: 600px) {
                .overtime-options {
                    grid-template-columns: 1fr;
                }
            }
            .overtime-option-group {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
            }
            .overtime-option-group h5 {
                margin: 0 0 12px 0;
                font-size: 13px;
                font-weight: 600;
                color: #374151;
            }
            .overtime-radio-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .overtime-radio-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .overtime-radio-item input[type="radio"] {
                width: 16px;
                height: 16px;
                accent-color: #3b82f6;
            }
            .overtime-radio-item label {
                font-size: 13px;
                color: #374151;
                cursor: pointer;
            }
            
            .calc-save-container {
                display: flex;
                justify-content: flex-end;
                padding-top: 8px;
            }
            .calc-save-container .btn-primary {
                padding: 12px 28px;
                font-size: 15px;
                font-weight: 600;
            }
        </style>
        
        <div class="calc-container">
            <!-- 연도 선택 -->
            <div class="calc-year-selector">
                <div class="year-select-group">
                    <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 연도 선택</label>
                    <select id="calculationSettingsYear" onchange="changeCalculationSettingsYear(this.value)">
                        ${_generateYearOptionsForCalculation(currentCalculationSettingsYear, availableYears)}
                    </select>
                    <button class="btn btn-secondary btn-sm" onclick="createNewCalculationSettingsYear()">+ 새 연도</button>
                    <button class="btn btn-secondary btn-sm" onclick="copyCalculationSettingsFromPrevYear()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 전년도 복사</button>
                </div>
                <div class="year-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg> ${currentCalculationSettingsYear}년 수당 계산 설정
                </div>
            </div>
            
            <!-- 월소정근로시간 소수점 처리 -->
            <div class="calc-section">
                <div class="calc-section-header">
                    <h4>⏱️ 월소정근로시간 소수점 처리</h4>
                </div>
                <div class="calc-section-body">
                    <div class="calc-item-desc">
                        월소정근로시간 계산 시 소수점 처리 방식을 선택합니다.<br>
                        <strong>공식</strong>: (주 근무시간 + 주휴시간) × (365 ÷ 12 ÷ 7)
                    </div>
                    
                    <div class="calc-radio-group">
                        <label class="calc-radio-item ${monthlyHoursRounding === 'ceil' ? 'selected' : ''}" onclick="selectCalcRadio(this, 'monthlyHoursRounding', 'ceil')">
                            <input type="radio" name="monthlyHoursRounding" value="ceil" ${monthlyHoursRounding === 'ceil' ? 'checked' : ''}>
                            <span class="calc-radio-label">올림</span>
                            <span class="calc-radio-example">130.357 → 131시간</span>
                        </label>
                        <label class="calc-radio-item ${monthlyHoursRounding === 'round' ? 'selected' : ''}" onclick="selectCalcRadio(this, 'monthlyHoursRounding', 'round')">
                            <input type="radio" name="monthlyHoursRounding" value="round" ${monthlyHoursRounding === 'round' ? 'checked' : ''}>
                            <span class="calc-radio-label">반올림</span>
                            <span class="calc-radio-example">130.357 → 130시간, 130.5 → 131시간</span>
                        </label>
                        <label class="calc-radio-item ${monthlyHoursRounding === 'floor' ? 'selected' : ''}" onclick="selectCalcRadio(this, 'monthlyHoursRounding', 'floor')">
                            <input type="radio" name="monthlyHoursRounding" value="floor" ${monthlyHoursRounding === 'floor' ? 'checked' : ''}>
                            <span class="calc-radio-label">버림</span>
                            <span class="calc-radio-example">130.357 → 130시간</span>
                        </label>
                    </div>
                    
                    <div class="calc-note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>고용노동부 기준</strong>: 법령상 별도 규정 없으며, 노사 합의로 결정합니다.<br>
                        시급 계산 시 월소정근로시간이 분모이므로, <strong>버림 시 근로자에게 유리</strong>합니다.
                    </div>
                </div>
            </div>
            
            <!-- 시급 절사 방식 -->
            <div class="calc-section">
                <div class="calc-section-header">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 시급 절사 방식</h4>
                </div>
                <div class="calc-section-body">
                    <div class="calc-item-desc">
                        통상임금 ÷ 월소정근로시간 계산 결과(시급)의 절사 방식을 선택합니다.<br>
                        <strong>예시</strong>: 3,276,813원 ÷ 209시간 = 15,678.53...원
                    </div>
                    
                    <!-- 처리 방식 선택 -->
                    <div class="hourly-wage-type-group" style="margin-bottom: 16px;">
                        <h5 style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px;">처리 방식</h5>
                        <div class="calc-radio-group">
                            <label class="calc-radio-item ${hourlyWageRounding.type === 'decimal' ? 'selected' : ''}" onclick="selectHourlyWageType('decimal')">
                                <input type="radio" name="hourlyWageType" value="decimal" ${hourlyWageRounding.type === 'decimal' ? 'checked' : ''}>
                                <span class="calc-radio-label">소수점 유지</span>
                                <span class="calc-radio-example">15,678.53...원 그대로 사용</span>
                            </label>
                            <label class="calc-radio-item ${hourlyWageRounding.type === 'integer' ? 'selected' : ''}" onclick="selectHourlyWageType('integer')">
                                <input type="radio" name="hourlyWageType" value="integer" ${hourlyWageRounding.type === 'integer' ? 'checked' : ''}>
                                <span class="calc-radio-label">정수 처리</span>
                                <span class="calc-radio-example">단위/방식에 따라 절사</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 정수 처리 옵션 (정수 처리 선택 시에만 표시) -->
                    <div id="hourlyWageIntegerOptions" class="overtime-options" style="${hourlyWageRounding.type === 'integer' ? '' : 'display: none;'}">
                        <div class="overtime-option-group">
                            <h5>절사 단위</h5>
                            <div class="overtime-radio-list">
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageUnit" id="hwUnit1" value="1" ${hourlyWageRounding.unit === 1 ? 'checked' : ''}>
                                    <label for="hwUnit1">1원 단위</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageUnit" id="hwUnit10" value="10" ${hourlyWageRounding.unit === 10 ? 'checked' : ''}>
                                    <label for="hwUnit10">10원 단위</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="overtime-option-group">
                            <h5>절사 방식</h5>
                            <div class="overtime-radio-list">
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageMethod" id="hwMethodFloor" value="floor" ${hourlyWageRounding.method === 'floor' ? 'checked' : ''}>
                                    <label for="hwMethodFloor">버림</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageMethod" id="hwMethodRound" value="round" ${hourlyWageRounding.method === 'round' ? 'checked' : ''}>
                                    <label for="hwMethodRound">반올림</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageMethod" id="hwMethodCeil" value="ceil" ${hourlyWageRounding.method === 'ceil' ? 'checked' : ''}>
                                    <label for="hwMethodCeil">올림</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="overtime-option-group">
                            <h5>절사 적용 시점 ⭐</h5>
                            <div class="overtime-radio-list">
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageApplyTiming" id="hwTimingAfter" value="after" ${(hourlyWageRounding.applyTiming || 'after') === 'after' ? 'checked' : ''}>
                                    <label for="hwTimingAfter">배율 적용 후 절사 <span style="color:#6b7280;font-size:11px;">(원시급×1.5→절사)</span></label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="hourlyWageApplyTiming" id="hwTimingBefore" value="before" ${hourlyWageRounding.applyTiming === 'before' ? 'checked' : ''}>
                                    <label for="hwTimingBefore">배율 적용 전 절사 <span style="color:#6b7280;font-size:11px;">(원시급→절사→×1.5)</span></label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calc-note yellow" style="margin-top: 16px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>절사 단위/방식 예시</strong> (15,678.53원 기준):<br>
                        • 소수점 유지 → 15,678.53원<br>
                        • 1원 버림 → 15,678원 | 10원 버림 → 15,670원<br>
                        • 1원 반올림 → 15,679원 | 10원 반올림 → 15,680원<br>
                        • 1원 올림 → 15,679원 | 10원 올림 → 15,680원
                    </div>
                    
                    <div class="calc-note blue" style="margin-top: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>배율 적용 시점 예시</strong> (통상임금 3,341,360원 ÷ 209시간 = 15,989.76원, 10원 버림 기준):<br>
                        • <strong>[배율 후 절사]</strong> 1배=15,980원, 1.5배=23,980원 <span style="color:#6b7280;">(15,989.76×1.5=23,984.64→절사)</span><br>
                        • <strong>[배율 전 절사]</strong> 1배=15,980원, 1.5배=23,970원 <span style="color:#6b7280;">(15,980×1.5=23,970)</span>
                    </div>
                </div>
            </div>
            
            <!-- 시간외수당 절사 방식 -->
            <div class="calc-section">
                <div class="calc-section-header">
                    <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> 시간외수당 절사 방식</h4>
                </div>
                <div class="calc-section-body">
                    <div class="calc-item-desc">
                        시간외근무수당(연장·야간·휴일) 계산 후 최종 금액의 절사 방식을 선택합니다.<br>
                        <strong>예시</strong>: 시급 15,678.53원 × 4시간 × 1.5 = 94,071.18원
                    </div>
                    
                    <div class="overtime-options">
                        <div class="overtime-option-group">
                            <h5>절사 단위</h5>
                            <div class="overtime-radio-list">
                                <div class="overtime-radio-item">
                                    <input type="radio" name="overtimeUnit" id="unit1" value="1" ${overtimeRounding.unit === 1 ? 'checked' : ''}>
                                    <label for="unit1">1원 단위</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="overtimeUnit" id="unit10" value="10" ${overtimeRounding.unit === 10 ? 'checked' : ''}>
                                    <label for="unit10">10원 단위</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="overtime-option-group">
                            <h5>절사 방식</h5>
                            <div class="overtime-radio-list">
                                <div class="overtime-radio-item">
                                    <input type="radio" name="overtimeMethod" id="methodFloor" value="floor" ${overtimeRounding.method === 'floor' ? 'checked' : ''}>
                                    <label for="methodFloor">버림</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="overtimeMethod" id="methodRound" value="round" ${overtimeRounding.method === 'round' ? 'checked' : ''}>
                                    <label for="methodRound">반올림</label>
                                </div>
                                <div class="overtime-radio-item">
                                    <input type="radio" name="overtimeMethod" id="methodCeil" value="ceil" ${overtimeRounding.method === 'ceil' ? 'checked' : ''}>
                                    <label for="methodCeil">올림</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calc-note yellow" style="margin-top: 16px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <strong>설정 결과 예시</strong> (94,071.18원 기준):<br>
                        • 1원 버림 → 94,071원 | 10원 버림 → 94,070원<br>
                        • 1원 반올림 → 94,071원 | 10원 반올림 → 94,070원<br>
                        • 1원 올림 → 94,072원 | 10원 올림 → 94,080원
                    </div>
                </div>
            </div>
            
            <!-- 저장 버튼 -->
            <div class="calc-save-container">
                <button class="btn btn-primary" onclick="saveCalculationSettings()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 설정 저장</button>
            </div>
        </div>
    `;
}

/**
 * 수당 계산 설정 연도 옵션 생성
 * @private
 */
function _generateYearOptionsForCalculation(selectedYear, availableYears) {
    const currentYear = new Date().getFullYear();
    const years = new Set([...availableYears, currentYear, currentYear + 1]);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    return sortedYears.map(year => 
        `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}년</option>`
    ).join('');
}

/**
 * 라디오 버튼 선택 시 스타일 변경
 * @param {HTMLElement} element - 선택된 요소
 * @param {string} name - 라디오 그룹명
 * @param {string} value - 선택된 값
 */
function selectCalcRadio(element, name, value) {
 // 같은 그룹의 모든 항목에서 selected 제거
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
        radio.closest('.calc-radio-item')?.classList.remove('selected');
    });
 // 선택된 항목에 selected 추가
    element.classList.add('selected');
}

/**
 * 시급 절사 방식 타입 선택 (소수점 유지 / 정수 처리)
 * @param {string} type - 'decimal' 또는 'integer'
 */
function selectHourlyWageType(type) {
 // 라디오 버튼 선택
    document.querySelectorAll('input[name="hourlyWageType"]').forEach(radio => {
        radio.closest('.calc-radio-item')?.classList.remove('selected');
        if (radio.value === type) {
            radio.checked = true;
            radio.closest('.calc-radio-item')?.classList.add('selected');
        }
    });
    
 // 정수 처리 옵션 표시/숨김
    const optionsDiv = document.getElementById('hourlyWageIntegerOptions');
    if (optionsDiv) {
        optionsDiv.style.display = type === 'integer' ? '' : 'none';
    }
}

// ===== 수당 계산 설정 이벤트 핸들러 =====

/**
 * 수당 계산 설정 연도 변경
 * @param {string} year - 연도
 */
function changeCalculationSettingsYear(year) {
    currentCalculationSettingsYear = Number(year);
    renderSalaryTab(SALARY_TABS.CALCULATION);
}

/**
 * 새 연도 수당 계산 설정 생성
 */
async function createNewCalculationSettingsYear() {
    const defaultYear = new Date().getFullYear() + 1;
    const yearNum = await showYearSelectModal(defaultYear, '수당 계산 설정 연도 선택');
    if (!yearNum) return;
    
    const settings = SalarySettingsManager.loadOrdinarySettings();
    if (settings[String(yearNum)]) {
        에러처리_인사?.warn(`${yearNum}년 설정이 이미 존재합니다.`);
        return;
    }
    
 // 기본값으로 생성
    SalarySettingsManager.saveOrdinarySettingsByYear(yearNum, {
        includeHolidayBonus: true,
        includePositionAllowance: true,
        includeActingAllowance: true,
        monthlyHoursRounding: 'round',
        hourlyWageRounding: { type: 'decimal', unit: 1, method: 'floor', applyTiming: 'after' },
        overtimeRounding: { unit: 10, method: 'round' }
    });
    
    currentCalculationSettingsYear = yearNum;
    renderSalaryTab(SALARY_TABS.CALCULATION);
    에러처리_인사?.success(`${yearNum}년 수당 계산 설정이 생성되었습니다.`);
}

/**
 * 전년도 수당 계산 설정 복사
 */
function copyCalculationSettingsFromPrevYear() {
    const prevYear = currentCalculationSettingsYear - 1;
    const settings = SalarySettingsManager.loadOrdinarySettings();
    
    if (!settings[String(prevYear)]) {
        에러처리_인사?.warn(`${prevYear}년 설정이 없습니다.`);
        return;
    }
    
    if (!confirm(`${prevYear}년 설정을 ${currentCalculationSettingsYear}년으로 복사하시겠습니까?`)) {
        return;
    }
    
    const prevSettings = settings[String(prevYear)];
    const existingSettings = SalarySettingsManager.getOrdinarySettingsByYear(currentCalculationSettingsYear);
    
    SalarySettingsManager.saveOrdinarySettingsByYear(currentCalculationSettingsYear, {
        ...existingSettings,
        monthlyHoursRounding: prevSettings.monthlyHoursRounding || 'round',
        hourlyWageRounding: prevSettings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor', applyTiming: 'after' },
        overtimeRounding: prevSettings.overtimeRounding || { unit: 10, method: 'round' }
    });
    
    renderSalaryTab(SALARY_TABS.CALCULATION);
    에러처리_인사?.success(`${prevYear}년 → ${currentCalculationSettingsYear}년 복사 완료`);
}

/**
 * 수당 계산 설정 저장
 */
function saveCalculationSettings() {
    try {
 // 월소정근로시간 소수점 처리 방식
        const monthlyHoursRounding = document.querySelector('input[name="monthlyHoursRounding"]:checked')?.value || 'round';
        
 // 시급 절사 방식
        const hourlyWageType = document.querySelector('input[name="hourlyWageType"]:checked')?.value || 'decimal';
        const hourlyWageUnit = parseInt(document.querySelector('input[name="hourlyWageUnit"]:checked')?.value || '1', 10);
        const hourlyWageMethod = document.querySelector('input[name="hourlyWageMethod"]:checked')?.value || 'floor';
        const hourlyWageApplyTiming = document.querySelector('input[name="hourlyWageApplyTiming"]:checked')?.value || 'after';
        
 // 시간외수당 절사 방식
        const overtimeUnit = parseInt(document.querySelector('input[name="overtimeUnit"]:checked')?.value || '10', 10);
        const overtimeMethod = document.querySelector('input[name="overtimeMethod"]:checked')?.value || 'round';
        
 // 기존 설정 로드 (통상임금 포함 항목 유지)
        const existingSettings = SalarySettingsManager.getOrdinarySettingsByYear(currentCalculationSettingsYear);
        
        SalarySettingsManager.saveOrdinarySettingsByYear(currentCalculationSettingsYear, {
            ...existingSettings,
            monthlyHoursRounding,
            hourlyWageRounding: {
                type: hourlyWageType,
                unit: hourlyWageUnit,
                method: hourlyWageMethod,
                applyTiming: hourlyWageApplyTiming
            },
            overtimeRounding: {
                unit: overtimeUnit,
                method: overtimeMethod
            }
        });
        
        에러처리_인사?.success(`${currentCalculationSettingsYear}년 수당 계산 설정이 저장되었습니다.`);
        로거_인사?.info('수당 계산 설정 저장', { 
            year: currentCalculationSettingsYear, 
            monthlyHoursRounding,
            hourlyWageRounding: { type: hourlyWageType, unit: hourlyWageUnit, method: hourlyWageMethod, applyTiming: hourlyWageApplyTiming },
            overtimeRounding: { unit: overtimeUnit, method: overtimeMethod }
        });
        
    } catch (error) {
        로거_인사?.error('수당 계산 설정 저장 실패', error);
        에러처리_인사?.warn('설정 저장 중 오류가 발생했습니다.');
    }
}

// ===== 네비게이션 연동 =====

// navigateToModule 함수에서 호출될 수 있도록 전역 등록
if (typeof window !== 'undefined') {
 // 모듈 초기화
    window.initSalarySettingsModule = initSalarySettingsModule;
    window.renderSalaryTab = renderSalaryTab;
    
 // 직급 관리
    window.addRankGrade = addRankGrade;
    window.editRankGrade = editRankGrade;
    window.deleteRankGrade = deleteRankGrade;
    window.moveRankGrade = moveRankGrade;
    window.addSalaryGrade = addSalaryGrade;
    window.editSalaryGrade = editSalaryGrade;
    window.deleteSalaryGrade = deleteSalaryGrade;
    window.moveSalaryGrade = moveSalaryGrade;
    window.importGradesFromEmployees = importGradesFromEmployees;  // ⭐ 신규: 기존 데이터에서 직급 불러오기
    window.deleteAllGrades = deleteAllGrades;  // ⭐ 신규: 직급 일괄 삭제
    window.changeGradeYear = changeGradeYear;  // ⭐ 신규: 직급 연도 변경
    window.createNewGradeYear = createNewGradeYear;  // ⭐ 신규: 새 연도 생성
    window.copyGradesFromPrevYear = copyGradesFromPrevYear;  // ⭐ 신규: 전년도 복사
    window.deleteGradeYear = deleteGradeYear;  // ⭐ 신규: 연도 삭제
    
 // 급여표 관리
    window.changeSalaryTableYear = changeSalaryTableYear;
    window.createNewYearTable = createNewYearTable;
    window.copyFromPrevYear = copyFromPrevYear;
    window.updateMaxRank = updateMaxRank;
    window.onSalaryInputChange = onSalaryInputChange;
    window.formatSalaryInput = formatSalaryInput;
    window.saveSalaryTable = saveSalaryTable;
    window.downloadRankTableExcel = downloadRankTableExcel;
    window.showRankTableUpload = showRankTableUpload;
    window.closeRankTableUpload = closeRankTableUpload;
    window.handleRankTableExcel = handleRankTableExcel;
    
 // 직책수당 설정
    window.changePositionAllowanceYear = changePositionAllowanceYear;
    window.createNewPositionYear = createNewPositionYear;
    window.copyPositionFromPrevYear = copyPositionFromPrevYear;
    window.onPositionAllowanceChange = onPositionAllowanceChange;
    window.formatPositionAllowanceInput = formatPositionAllowanceInput;
    window.addNewPosition = addNewPosition;
    window.savePositionAllowances = savePositionAllowances;
    window.onPaPositionSelect = onPaPositionSelect;
    window.addPositionAllowance = addPositionAllowance;
    window.deletePositionAllowance = deletePositionAllowance;
    
 // 명절휴가비 설정
    window.changeHolidayBonusYear = changeHolidayBonusYear;
    window.createNewHolidayYear = createNewHolidayYear;
    window.onHolidayFieldChange = onHolidayFieldChange;
    window.saveHolidayBonus = saveHolidayBonus;
    
 // 통상임금 설정
    window.changeOrdinarySettingsYear = changeOrdinarySettingsYear;
    window.createNewOrdinarySettingsYear = createNewOrdinarySettingsYear;
    window.copyOrdinarySettingsFromPrevYear = copyOrdinarySettingsFromPrevYear;
    window.saveOrdinarySettings = saveOrdinarySettings;
    window.toggleHolidayBonusMethod = toggleHolidayBonusMethod;
    window.updateMethodSelection = updateMethodSelection;
    
 // 수당 계산 설정
    window.changeCalculationSettingsYear = changeCalculationSettingsYear;
    window.createNewCalculationSettingsYear = createNewCalculationSettingsYear;
    window.copyCalculationSettingsFromPrevYear = copyCalculationSettingsFromPrevYear;
    window.saveCalculationSettings = saveCalculationSettings;
    window.selectCalcRadio = selectCalcRadio;
    window.selectHourlyWageType = selectHourlyWageType;
}

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log(' 급여설정_인사.js 로드 완료');
}
