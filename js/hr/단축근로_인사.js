/**
 * 단축근로_인사.js - 단축근로 관리 모듈
 * 
 * 임신기/육아기 단축근로 및 10시 출근제 통합 관리
 * 
 * @version 1.0
 * @since 2025-11-26
 * 
 * [기능]
 * 1. 임신기 근로시간 단축 (1일 2시간, 급여 100%, 시간외근로 금지)
 * 2. 육아기 근로시간 단축 (주 15~35시간, 요일별 설정, 급여 비례)
 * 3. 육아기 10시 출근제 (시간 조정, 급여 100%)
 * 4. 급여 시스템 연동용 API
 * 
 * [의존성]
 * - 상수_인사.js
 * - 로거_인사.js
 * - 에러처리_인사.js
 * - 데이터베이스_인사.js
 * - 직원유틸_인사.js
 * - DOM유틸_인사.js
 * - 검증_인사.js
 */

// ===== 전역 변수 =====
let currentReducedWorkTab = 'pregnancy';  // 현재 선택된 서브탭
let currentReducedWorkEmployeeId = null;  // 현재 선택된 직원 ID
let editingReducedWorkId = null;          // 수정 중인 단축근로 ID

// ===== 상수 정의 =====
const REDUCED_WORK_TYPES = {
    PREGNANCY: 'pregnancy',
    CHILDCARE: 'childcare',
    FLEX_TIME: 'flexTime'
};

const PREGNANCY_TYPES = {
    EARLY: 'early',      // 12주 이내
    LATE: 'late',        // 32주 이후
    HIGH_RISK: 'high_risk'  // 고위험 임신
};

const PREGNANCY_TYPE_LABELS = {
    'early': '임신 12주 이내',
    'late': '임신 32주 이후',
    'high_risk': '고위험 임신 (전 기간)'
};

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ===== 메인 탭 로드 =====

/**
 * 단축근로 관리 탭 초기화
 */
function loadReducedWorkTab() {
    try {
        로거_인사?.info('단축근로 관리 탭 로드');
        
        const container = document.getElementById('module-reduced-work');
        if (!container) {
            throw new Error('단축근로 모듈 컨테이너를 찾을 수 없습니다.');
        }
        
 // 탭 UI 생성
        container.innerHTML = _generateReducedWorkTabHTML();
        
 // 기본 탭(임신기) 로드
        switchReducedWorkSubTab('pregnancy');
        
    } catch (error) {
        로거_인사?.error('단축근로 탭 로드 오류', error);
        에러처리_인사?.handle(error, '단축근로 관리 화면을 로드하는 중 오류가 발생했습니다.');
    }
}

/**
 * 단축근로 탭 HTML 생성
 * @private
 */
function _generateReducedWorkTabHTML() {
    return `
        <div class="reduced-work-tabs">
            <button class="reduced-work-tab active" data-tab="pregnancy" onclick="switchReducedWorkSubTab('pregnancy')">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg></span>
                <span>임신기 단축근로</span>
            </button>
            <button class="reduced-work-tab" data-tab="childcare" onclick="switchReducedWorkSubTab('childcare')">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg></span>
                <span>육아기 단축근로</span>
            </button>
            <button class="reduced-work-tab" data-tab="flexTime" onclick="switchReducedWorkSubTab('flexTime')">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                <span>10시 출근제</span>
            </button>
        </div>
        
        <div id="reducedWorkTabContent">
            <!-- 서브탭 콘텐츠가 여기에 로드됨 -->
        </div>
    `;
}

// ===== 서브탭 전환 =====

/**
 * 서브탭 전환
 * @param {string} tabName - 탭 이름 (pregnancy, childcare, flexTime)
 */
function switchReducedWorkSubTab(tabName) {
    try {
        로거_인사?.debug('서브탭 전환', { tabName });
        
        currentReducedWorkTab = tabName;
        editingReducedWorkId = null;
        
 // 탭 버튼 활성화 상태 업데이트
        document.querySelectorAll('.reduced-work-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
 // 탭 콘텐츠 로드
        const contentContainer = document.getElementById('reducedWorkTabContent');
        if (!contentContainer) return;
        
        switch (tabName) {
            case 'pregnancy':
                contentContainer.innerHTML = _generatePregnancyTabHTML();
                _loadPregnancyEmployeeSelect();
                loadPregnancyReductionList();
                break;
            case 'childcare':
                contentContainer.innerHTML = _generateChildcareTabHTML();
                _loadChildcareEmployeeSelect();
                loadChildcareReductionList();
                break;
            case 'flexTime':
                contentContainer.innerHTML = _generateFlexTimeTabHTML();
                _loadFlexTimeEmployeeSelect();
                loadFlexTimeList();
                break;
        }
        
    } catch (error) {
        로거_인사?.error('서브탭 전환 오류', { tabName, error });
        에러처리_인사?.handle(error, '탭 전환 중 오류가 발생했습니다.');
    }
}

// ========================================
// 임신기 단축근로
// ========================================

/**
 * 임신기 탭 HTML 생성
 * @private
 */
function _generatePregnancyTabHTML() {
    return `
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 임신기 근로시간 단축 등록</div>
            
            <div class="reduced-work-notice danger">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                <span><strong>임신기 근로자는 시간외근로·야간근로·휴일근로가 금지됩니다.</strong><br>
                (근로기준법 제74조, 제70조 / 위반 시 2년 이하 징역 또는 2천만원 이하 벌금)</span>
            </div>
            
            <div class="form-group">
                <label>직원 선택 *</label>
                <select id="pregnancyEmployeeSelect" class="form-control" onchange="onPregnancyEmployeeChange()">
                    <option value="">선택하세요</option>
                </select>
            </div>
            
            <div id="pregnancyFormFields" style="display: none;">
                <div class="form-group">
                    <label>구분 *</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="pregnancyType" value="early" checked>
                            <span>임신 12주 이내</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="pregnancyType" value="late">
                            <span>임신 32주 이후</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="pregnancyType" value="high_risk">
                            <span>고위험 임신 (전 기간)</span>
                        </label>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>출산예정일</label>
                        <input type="date" id="pregnancyDueDate" class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>단축 시작일 *</label>
                        <input type="date" id="pregnancyStartDate" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>단축 종료일 *</label>
                        <input type="date" id="pregnancyEndDate" class="form-control">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>단축 방식</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="pregnancyMethod" value="late_start" checked>
                            <span>출근 2시간 늦춤 (11시 출근)</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="pregnancyMethod" value="early_end">
                            <span>퇴근 2시간 앞당김 (16시 퇴근)</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="pregnancyMethod" value="both">
                            <span>출퇴근 각 1시간 조정 (10시~17시)</span>
                        </label>
                    </div>
                </div>
                
                <div class="reduced-work-notice info">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                    <span>임신기 단축근로는 <strong>1일 2시간 단축</strong>이며, <strong>급여 100% 보전</strong>됩니다.</span>
                </div>
                
                <div class="form-group">
                    <label>비고</label>
                    <textarea id="pregnancyNote" class="form-control" rows="2" placeholder="특이사항 입력"></textarea>
                </div>
                
                <button class="btn btn-primary" style="width: 100%;" onclick="savePregnancyReduction()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 임신기 단축근로 등록
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 임신기 단축근로 현황</div>
            <div id="pregnancyReductionList">
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 임신기 단축근로가 없습니다.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * 임신기 직원 선택 목록 로드
 * @private
 */
function _loadPregnancyEmployeeSelect() {
    try {
        const select = document.getElementById('pregnancyEmployeeSelect');
        if (!select) return;
        
        const employees = db.getActiveEmployees();
        
        select.innerHTML = '<option value="">선택하세요</option>';
        employees.forEach(emp => {
            const displayName = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.getDisplayName(emp)
                : `${emp.personalInfo?.name || emp.name} (${emp.currentPosition?.dept || ''})`;
            select.innerHTML += `<option value="${emp.id}">${displayName}</option>`;
        });
        
    } catch (error) {
        로거_인사?.error('임신기 직원 목록 로드 오류', error);
    }
}

/**
 * 임신기 직원 선택 변경 시
 */
function onPregnancyEmployeeChange() {
    const select = document.getElementById('pregnancyEmployeeSelect');
    const formFields = document.getElementById('pregnancyFormFields');
    
    if (select && formFields) {
        currentReducedWorkEmployeeId = select.value;
        formFields.style.display = select.value ? 'block' : 'none';
        
 // 수정 모드 해제
        editingReducedWorkId = null;
        _resetPregnancyForm();
    }
}

/**
 * 임신기 폼 초기화
 * @private
 */
function _resetPregnancyForm() {
    document.querySelector('input[name="pregnancyType"][value="early"]')?.click();
    document.getElementById('pregnancyDueDate').value = '';
    document.getElementById('pregnancyStartDate').value = '';
    document.getElementById('pregnancyEndDate').value = '';
    document.querySelector('input[name="pregnancyMethod"][value="late_start"]')?.click();
    document.getElementById('pregnancyNote').value = '';
}

/**
 * 임신기 단축근로 저장
 */
function savePregnancyReduction() {
    try {
        로거_인사?.info('임신기 단축근로 저장 시작');
        
 // 1. 데이터 수집
        const empId = document.getElementById('pregnancyEmployeeSelect')?.value;
        const type = document.querySelector('input[name="pregnancyType"]:checked')?.value;
        const dueDate = document.getElementById('pregnancyDueDate')?.value;
        const startDate = document.getElementById('pregnancyStartDate')?.value;
        const endDate = document.getElementById('pregnancyEndDate')?.value;
        const method = document.querySelector('input[name="pregnancyMethod"]:checked')?.value;
        const note = document.getElementById('pregnancyNote')?.value || '';
        
 // 2. 필수 입력 검증
        if (!empId) {
            alert('[주의] 직원을 선택해주세요.');
            return;
        }
        if (!startDate || !endDate) {
            alert('[주의] 단축 기간을 입력해주세요.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('[주의] 종료일은 시작일 이후여야 합니다.');
            return;
        }
        
 // 3. 기간 중복 검증
        if (_checkPeriodOverlap(empId, 'pregnancy', startDate, endDate, editingReducedWorkId)) {
            alert('[주의] 해당 기간에 이미 등록된 임신기 단축근로가 있습니다.');
            return;
        }
        
 // 4. 데이터 구성
        const workHours = _calculateWorkHours(method);
        const reductionData = {
            id: editingReducedWorkId || _generateReducedWorkId('pregnancy'),
            type: type,
            expectedDueDate: dueDate || null,
            startDate: startDate,
            endDate: endDate,
            dailyReduction: 2,
            originalHours: 8,
            reducedHours: 6,
            reductionMethod: method,
            workStart: workHours.start,
            workEnd: workHours.end,
            overtimeAllowed: false,
            nightWorkAllowed: false,
            holidayWorkAllowed: false,
            note: note,
            createdAt: editingReducedWorkId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
 // 5. 저장
        const emp = db.findEmployee(empId);
        if (!emp) {
            throw new Error('직원 정보를 찾을 수 없습니다.');
        }
        
 // reducedWork 구조 보장
        if (!emp.reducedWork) {
            emp.reducedWork = { pregnancy: [], childcare: [], flexTime: [] };
        }
        if (!Array.isArray(emp.reducedWork.pregnancy)) {
            emp.reducedWork.pregnancy = [];
        }
        
        if (editingReducedWorkId) {
 // 수정
            const index = emp.reducedWork.pregnancy.findIndex(r => r.id === editingReducedWorkId);
            if (index !== -1) {
                reductionData.createdAt = emp.reducedWork.pregnancy[index].createdAt;
                emp.reducedWork.pregnancy[index] = reductionData;
            }
        } else {
 // 신규
            emp.reducedWork.pregnancy.push(reductionData);
        }
        
        db.saveEmployee(emp);
        
 // 6. UI 갱신
        loadPregnancyReductionList();
        _resetPregnancyForm();
        document.getElementById('pregnancyEmployeeSelect').value = '';
        document.getElementById('pregnancyFormFields').style.display = 'none';
        editingReducedWorkId = null;
        
 // 전체 직원 목록 갱신
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
        alert(editingReducedWorkId ? '임신기 단축근로가 수정되었습니다.' : '임신기 단축근로가 등록되었습니다.');
        로거_인사?.info('임신기 단축근로 저장 완료', { empId, reductionData });
        
    } catch (error) {
        로거_인사?.error('임신기 단축근로 저장 오류', error);
        에러처리_인사?.handle(error, '임신기 단축근로 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 임신기 단축근로 목록 로드
 */
function loadPregnancyReductionList() {
    try {
        const container = document.getElementById('pregnancyReductionList');
        if (!container) return;
        
        const allReductions = _getAllReducedWorkByType('pregnancy');
        
        if (allReductions.length === 0) {
            container.innerHTML = `
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 임신기 단축근로가 없습니다.</p>
                </div>
            `;
            return;
        }
        
 // 상태별 정렬: 진행중 > 예정 > 종료
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sortedReductions = allReductions.map(item => {
            const start = new Date(item.data.startDate);
            const end = new Date(item.data.endDate);
            let status, statusOrder;
            
            if (today > end) {
                status = 'ended';
                statusOrder = 3;
            } else if (today < start) {
                status = 'scheduled';
                statusOrder = 2;
            } else {
                status = 'active';
                statusOrder = 1;
            }
            
            return { ...item, status, statusOrder };
        }).sort((a, b) => a.statusOrder - b.statusOrder);
        
 // 테이블 HTML 생성
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #fdf2f8; border-bottom: 2px solid #fbcfe8;">
                        <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #9d174d;">직원</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">유형</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">기간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">근무시간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">출산예정일</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">상태</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #9d174d;">관리</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedReductions.forEach((item, idx) => {
            const emp = db.findEmployee(item.empId);
            const empName = emp ? (typeof 직원유틸_인사 !== 'undefined' ? 직원유틸_인사.getDisplayName(emp) : (emp.personalInfo?.name || emp.name)) : '알 수 없음';
            const safeEmpName = DOM유틸_인사?.escapeHtml ? DOM유틸_인사.escapeHtml(empName) : empName;
            
            const typeLabel = PREGNANCY_TYPE_LABELS[item.data.type] || item.data.type;
            const workTime = `${item.data.workStart || '11:00'}~${item.data.workEnd || '18:00'}`;
            
 // 상태 배지
            let statusBadge = '';
            let rowBgColor = idx % 2 === 0 ? '#ffffff' : '#fdf2f8';
            
            if (item.status === 'active') {
                statusBadge = '<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">진행중</span>';
            } else if (item.status === 'scheduled') {
                statusBadge = '<span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">예정</span>';
            } else {
                statusBadge = '<span style="background: #f3f4f6; color: #6b7280; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">종료</span>';
                rowBgColor = idx % 2 === 0 ? '#fafafa' : '#f5f5f5';
            }
            
            html += `
                <tr style="background: ${rowBgColor}; border-bottom: 1px solid #fce7f3;">
                    <td style="padding: 12px 8px; font-weight: 500;">${safeEmpName}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <span style="background: #fce7f3; color: #be185d; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${typeLabel}</span>
                    </td>
                    <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #64748b;">
                        ${item.data.startDate}<br>~ ${item.data.endDate}
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <div style="font-weight: 500;">${workTime}</div>
                        <div style="font-size: 11px; color: #64748b;">1일 6h</div>
                    </td>
                    <td style="padding: 12px 8px; text-align: center; color: #64748b;">
                        ${item.data.expectedDueDate || '-'}
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <button class="btn btn-small" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="editPregnancyReduction('${item.empId}', '${item.data.id}')">수정</button>
                        <button class="btn btn-small btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deletePregnancyReduction('${item.empId}', '${item.data.id}')">삭제</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        로거_인사?.error('임신기 단축근로 목록 로드 오류', error);
    }
}

/**
 * 임신기 단축근로 수정
 */
function editPregnancyReduction(empId, id) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.pregnancy) return;
        
        const record = emp.reducedWork.pregnancy.find(r => r.id === id);
        if (!record) return;
        
 // 폼에 데이터 채우기
        document.getElementById('pregnancyEmployeeSelect').value = empId;
        document.getElementById('pregnancyFormFields').style.display = 'block';
        
        const typeRadio = document.querySelector(`input[name="pregnancyType"][value="${record.type}"]`);
        if (typeRadio) typeRadio.checked = true;
        
        document.getElementById('pregnancyDueDate').value = record.expectedDueDate || '';
        document.getElementById('pregnancyStartDate').value = record.startDate;
        document.getElementById('pregnancyEndDate').value = record.endDate;
        
        const methodRadio = document.querySelector(`input[name="pregnancyMethod"][value="${record.reductionMethod}"]`);
        if (methodRadio) methodRadio.checked = true;
        
        document.getElementById('pregnancyNote').value = record.note || '';
        
        currentReducedWorkEmployeeId = empId;
        editingReducedWorkId = id;
        
 // 스크롤 이동
        document.getElementById('pregnancyEmployeeSelect').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        로거_인사?.error('임신기 단축근로 수정 로드 오류', error);
    }
}

/**
 * 임신기 단축근로 삭제
 */
function deletePregnancyReduction(empId, id) {
    if (!confirm('[주의] 이 임신기 단축근로 기록을 삭제하시겠습니까?')) return;
    
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.pregnancy) return;
        
        emp.reducedWork.pregnancy = emp.reducedWork.pregnancy.filter(r => r.id !== id);
        db.saveEmployee(emp);
        
        loadPregnancyReductionList();
        alert('삭제되었습니다.');
        
    } catch (error) {
        로거_인사?.error('임신기 단축근로 삭제 오류', error);
        에러처리_인사?.handle(error, '삭제 중 오류가 발생했습니다.');
    }
}

// ========================================
// 육아기 근로시간 단축
// ========================================

/**
 * 육아기 탭 HTML 생성
 * @private
 */
function _generateChildcareTabHTML() {
    return `
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 육아기 근로시간 단축 등록</div>
            
            <div class="reduced-work-notice info">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>만 12세 이하(초6 이하) 자녀 양육을 위해 주 15~35시간으로 근로시간을 단축할 수 있습니다.<br>
                급여는 근로시간에 비례하여 조정되며, 고용보험에서 급여 지원을 받을 수 있습니다.</span>
            </div>
            
            <div class="form-group">
                <label>직원 선택 *</label>
                <select id="childcareEmployeeSelect" class="form-control" onchange="onChildcareEmployeeChange()">
                    <option value="">선택하세요</option>
                </select>
            </div>
            
            <div id="childcareFormFields" style="display: none;">
                <div class="card" style="background: #f9fafb; margin: 16px 0;">
                    <div class="card-title" style="font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 자녀 정보</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>자녀 이름 *</label>
                            <input type="text" id="childcareName" class="form-control" placeholder="자녀 이름">
                        </div>
                        <div class="form-group">
                            <label>자녀 생년월일 *</label>
                            <input type="date" id="childcareBirthDate" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>자녀 구분</label>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="childcareChildType" value="preschool" checked>
                                <span>유아 (미취학)</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="childcareChildType" value="elementary">
                                <span>초등학생</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>단축 시작일 *</label>
                        <input type="date" id="childcareStartDate" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>단축 종료일 *</label>
                        <input type="date" id="childcareEndDate" class="form-control">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>근무 유형 *</label>
                    <div class="schedule-type-selector">
                        <label class="schedule-type-option selected" onclick="selectScheduleType('uniform')">
                            <input type="radio" name="scheduleType" value="uniform" checked>
                            <div class="schedule-type-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                            <div class="schedule-type-label">균등 단축</div>
                            <div class="schedule-type-desc">매일 동일한 시간</div>
                        </label>
                        <label class="schedule-type-option" onclick="selectScheduleType('daily')">
                            <input type="radio" name="scheduleType" value="daily">
                            <div class="schedule-type-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                            <div class="schedule-type-label">요일별 차등</div>
                            <div class="schedule-type-desc">요일마다 다른 시간</div>
                        </label>
                    </div>
                </div>
                
                <div id="uniformScheduleSection">
                    <div class="card" style="background: #f0f9ff; border: 1px solid #bae6fd; margin: 12px 0;">
                        <div style="font-weight: 600; margin-bottom: 12px; color: #0369a1;">⏰ 근무시간 설정 (매일 동일)</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>출근시간 *</label>
                                <select id="childcareUniformStart" class="form-control" onchange="updateUniformEndTime()">
                                    <option value="08:00">08:00</option>
                                    <option value="09:00" selected>09:00</option>
                                    <option value="10:00">10:00</option>
                                    <option value="11:00">11:00</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>퇴근시간 *</label>
                                <select id="childcareUniformEnd" class="form-control" onchange="updateWeeklyHoursDisplay()">
                                    <option value="14:00">14:00 (4시간)</option>
                                    <option value="15:00">15:00 (5시간)</option>
                                    <option value="16:00" selected>16:00 (6시간)</option>
                                    <option value="17:00">17:00 (7시간)</option>
                                </select>
                            </div>
                        </div>
                        <div style="background: #e0f2fe; padding: 10px 12px; border-radius: 6px; font-size: 13px; color: #0c4a6e;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> 점심시간 12:00~13:00 (1시간) 제외 기준
                        </div>
                    </div>
                </div>
                
                <div id="dailyScheduleSection" style="display: none;">
                    <div class="card" style="background: #f0f9ff; border: 1px solid #bae6fd; margin: 12px 0;">
                        <div style="font-weight: 600; margin-bottom: 12px; color: #0369a1;">⏰ 요일별 근무시간 설정</div>
                        <div style="background: #e0f2fe; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #0c4a6e; margin-bottom: 12px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> 점심시간 12:00~13:00 (1시간) 제외 기준 | 근무 없는 날은 출근/퇴근 모두 "--" 선택
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 8px; text-align: center; width: 50px;">요일</th>
                                    <th style="padding: 8px; text-align: center;">출근</th>
                                    <th style="padding: 8px; text-align: center;">퇴근</th>
                                    <th style="padding: 8px; text-align: center; width: 70px;">근무시간</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 6px; text-align: center; font-weight: 600;">월</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_mon" class="form-control" style="padding: 6px;" onchange="updateDailyHours('mon')">
                                        <option value="">--</option><option value="08:00">08:00</option><option value="09:00" selected>09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_mon" class="form-control" style="padding: 6px;" onchange="updateDailyHours('mon')">
                                        <option value="">--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00" selected>16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_mon" style="font-weight: 600; color: #0369a1;">6h</span></td>
                                </tr>
                                <tr style="background: #fafafa;">
                                    <td style="padding: 6px; text-align: center; font-weight: 600;">화</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_tue" class="form-control" style="padding: 6px;" onchange="updateDailyHours('tue')">
                                        <option value="">--</option><option value="08:00">08:00</option><option value="09:00" selected>09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_tue" class="form-control" style="padding: 6px;" onchange="updateDailyHours('tue')">
                                        <option value="">--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00" selected>16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_tue" style="font-weight: 600; color: #0369a1;">6h</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; text-align: center; font-weight: 600;">수</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_wed" class="form-control" style="padding: 6px;" onchange="updateDailyHours('wed')">
                                        <option value="">--</option><option value="08:00">08:00</option><option value="09:00" selected>09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_wed" class="form-control" style="padding: 6px;" onchange="updateDailyHours('wed')">
                                        <option value="">--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00" selected>16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_wed" style="font-weight: 600; color: #0369a1;">6h</span></td>
                                </tr>
                                <tr style="background: #fafafa;">
                                    <td style="padding: 6px; text-align: center; font-weight: 600;">목</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_thu" class="form-control" style="padding: 6px;" onchange="updateDailyHours('thu')">
                                        <option value="">--</option><option value="08:00">08:00</option><option value="09:00" selected>09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_thu" class="form-control" style="padding: 6px;" onchange="updateDailyHours('thu')">
                                        <option value="">--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00" selected>16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_thu" style="font-weight: 600; color: #0369a1;">6h</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px; text-align: center; font-weight: 600;">금</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_fri" class="form-control" style="padding: 6px;" onchange="updateDailyHours('fri')">
                                        <option value="">--</option><option value="08:00">08:00</option><option value="09:00" selected>09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_fri" class="form-control" style="padding: 6px;" onchange="updateDailyHours('fri')">
                                        <option value="">--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00" selected>16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_fri" style="font-weight: 600; color: #0369a1;">6h</span></td>
                                </tr>
                                <tr style="background: #fef2f2;">
                                    <td style="padding: 6px; text-align: center; font-weight: 600; color: #dc2626;">토</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_sat" class="form-control" style="padding: 6px;" onchange="updateDailyHours('sat')">
                                        <option value="" selected>--</option><option value="08:00">08:00</option><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_sat" class="form-control" style="padding: 6px;" onchange="updateDailyHours('sat')">
                                        <option value="" selected>--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00">16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_sat" style="font-weight: 600; color: #9ca3af;">-</span></td>
                                </tr>
                                <tr style="background: #fef2f2;">
                                    <td style="padding: 6px; text-align: center; font-weight: 600; color: #dc2626;">일</td>
                                    <td style="padding: 6px;"><select id="scheduleStart_sun" class="form-control" style="padding: 6px;" onchange="updateDailyHours('sun')">
                                        <option value="" selected>--</option><option value="08:00">08:00</option><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option>
                                    </select></td>
                                    <td style="padding: 6px;"><select id="scheduleEnd_sun" class="form-control" style="padding: 6px;" onchange="updateDailyHours('sun')">
                                        <option value="" selected>--</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00">16:00</option><option value="17:00">17:00</option><option value="18:00">18:00</option>
                                    </select></td>
                                    <td style="padding: 6px; text-align: center;"><span id="scheduleHoursDisplay_sun" style="font-weight: 600; color: #9ca3af;">-</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="weekly-hours-display">
                    <div class="weekly-hours-value" id="weeklyHoursValue">30</div>
                    <div class="weekly-hours-label">시간 / 주</div>
                    <div class="weekly-hours-change" id="weeklyHoursChange">기존 40시간 → 30시간 (75%)</div>
                </div>
                
                <div class="form-row" style="margin-top: 16px;">
                    <div class="form-group">
                        <label>경력 인정률 (%)</label>
                        <input type="number" id="childcareRecognitionRate" class="form-control" value="100" min="0" max="100">
                        <small style="color: #6b7280;">기관 정책에 따라 설정 (기본 100%)</small>
                    </div>
                </div>
                
                <div class="reduced-work-notice info" style="margin-top: 16px;">
                    <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                    <span>근로자 명시적 청구 시 <strong>주 12시간 범위 내 연장근로</strong>가 가능합니다.</span>
                </div>
                
                <div class="form-group">
                    <label>비고</label>
                    <textarea id="childcareNote" class="form-control" rows="2" placeholder="특이사항 입력"></textarea>
                </div>
                
                <button class="btn btn-primary" style="width: 100%;" onclick="saveChildcareReduction()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 육아기 단축근로 등록
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 육아기 단축근로 현황</div>
            <div id="childcareReductionList">
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 육아기 단축근로가 없습니다.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * 육아기 직원 선택 목록 로드
 * @private
 */
function _loadChildcareEmployeeSelect() {
    try {
        const select = document.getElementById('childcareEmployeeSelect');
        if (!select) return;
        
        const employees = db.getActiveEmployees();
        
        select.innerHTML = '<option value="">선택하세요</option>';
        employees.forEach(emp => {
            const displayName = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.getDisplayName(emp)
                : `${emp.personalInfo?.name || emp.name} (${emp.currentPosition?.dept || ''})`;
            select.innerHTML += `<option value="${emp.id}">${displayName}</option>`;
        });
        
    } catch (error) {
        로거_인사?.error('육아기 직원 목록 로드 오류', error);
    }
}

/**
 * 육아기 직원 선택 변경 시
 */
function onChildcareEmployeeChange() {
    const select = document.getElementById('childcareEmployeeSelect');
    const formFields = document.getElementById('childcareFormFields');
    
    if (select && formFields) {
        currentReducedWorkEmployeeId = select.value;
        formFields.style.display = select.value ? 'block' : 'none';
        
        editingReducedWorkId = null;
        _resetChildcareForm();
        updateWeeklyHoursDisplay();
    }
}

/**
 * 육아기 폼 초기화
 * @private
 */
function _resetChildcareForm() {
    document.getElementById('childcareName').value = '';
    document.getElementById('childcareBirthDate').value = '';
    document.querySelector('input[name="childcareChildType"][value="preschool"]')?.click();
    document.getElementById('childcareStartDate').value = '';
    document.getElementById('childcareEndDate').value = '';
    selectScheduleType('uniform');
    
 // 균등 단축 초기화
    const uniformStart = document.getElementById('childcareUniformStart');
    if (uniformStart) {
        uniformStart.value = '09:00';
        updateUniformEndTime();
    }
    
 // 요일별 스케줄 초기화
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
        const startSelect = document.getElementById(`scheduleStart_${day}`);
        const endSelect = document.getElementById(`scheduleEnd_${day}`);
        if (startSelect) startSelect.value = '09:00';
        if (endSelect) endSelect.value = '16:00';
        updateDailyHours(day);
    });
    ['sat', 'sun'].forEach(day => {
        const startSelect = document.getElementById(`scheduleStart_${day}`);
        const endSelect = document.getElementById(`scheduleEnd_${day}`);
        if (startSelect) startSelect.value = '';
        if (endSelect) endSelect.value = '';
        updateDailyHours(day);
    });
    
    document.getElementById('childcareRecognitionRate').value = '100';
    document.getElementById('childcareNote').value = '';
    
    updateWeeklyHoursDisplay();
}

/**
 * 스케줄 유형 선택
 */
function selectScheduleType(type) {
    document.querySelectorAll('.schedule-type-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.schedule-type-option input[value="${type}"]`)?.closest('.schedule-type-option');
    if (selectedOption) {
        selectedOption.classList.add('selected');
        selectedOption.querySelector('input').checked = true;
    }
    
    document.getElementById('uniformScheduleSection').style.display = type === 'uniform' ? 'block' : 'none';
    document.getElementById('dailyScheduleSection').style.display = type === 'daily' ? 'block' : 'none';
    
    updateWeeklyHoursDisplay();
}

/**
 * 출근/퇴근 시간으로 근무시간 계산 (점심시간 1시간 제외)
 * @param {string} startTime - 출근시간 (HH:MM)
 * @param {string} endTime - 퇴근시간 (HH:MM)
 * @returns {number} 근무시간 (점심 제외)
 */
function calculateWorkHoursBetween(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    let totalMinutes = endMinutes - startMinutes;
    
 // 점심시간 (12:00~13:00) 제외
    const lunchStart = 12 * 60;  // 720
    const lunchEnd = 13 * 60;    // 780
    
    if (startMinutes < lunchEnd && endMinutes > lunchStart) {
 // 점심시간과 겹치는 경우
        const overlapStart = Math.max(startMinutes, lunchStart);
        const overlapEnd = Math.min(endMinutes, lunchEnd);
        if (overlapEnd > overlapStart) {
            totalMinutes -= (overlapEnd - overlapStart);
        }
    }
    
    return Math.max(0, totalMinutes / 60);
}

/**
 * 균등 단축 - 퇴근시간 옵션 업데이트
 */
function updateUniformEndTime() {
    const startTime = document.getElementById('childcareUniformStart')?.value || '09:00';
    const endSelect = document.getElementById('childcareUniformEnd');
    if (!endSelect) return;
    
    const [startH] = startTime.split(':').map(Number);
    
 // 퇴근시간 옵션 생성 (점심 1시간 포함하여 3~7시간 + 1 = 4~8시간 후)
    const options = [];
    for (let h = 3; h <= 7; h++) {
        let endH = startH + h + 1;  // 점심 1시간 포함
        if (endH > 18) break;
        const endTime = `${String(endH).padStart(2, '0')}:00`;
        const workHours = calculateWorkHoursBetween(startTime, endTime);
        options.push(`<option value="${endTime}">${endTime} (${workHours}시간)</option>`);
    }
    
    endSelect.innerHTML = options.join('');
    
 // 기본값 6시간 근무로 설정
    const defaultEnd = `${String(startH + 7).padStart(2, '0')}:00`;  // 6시간 + 점심 1시간
    if (endSelect.querySelector(`option[value="${defaultEnd}"]`)) {
        endSelect.value = defaultEnd;
    }
    
    updateWeeklyHoursDisplay();
}

/**
 * 요일별 근무시간 계산 및 표시
 */
function updateDailyHours(day) {
    const startSelect = document.getElementById(`scheduleStart_${day}`);
    const endSelect = document.getElementById(`scheduleEnd_${day}`);
    const hoursDisplay = document.getElementById(`scheduleHoursDisplay_${day}`);
    
    if (!startSelect || !endSelect || !hoursDisplay) return;
    
    const startTime = startSelect.value;
    const endTime = endSelect.value;
    
    if (!startTime || !endTime) {
        hoursDisplay.textContent = '-';
        hoursDisplay.style.color = '#9ca3af';
    } else {
        const hours = calculateWorkHoursBetween(startTime, endTime);
        hoursDisplay.textContent = `${hours}h`;
        hoursDisplay.style.color = hours > 0 ? '#0369a1' : '#dc2626';
    }
    
    updateWeeklyHoursDisplay();
}

/**
 * 주당 근무시간 표시 업데이트
 */
function updateWeeklyHoursDisplay() {
    const scheduleType = document.querySelector('input[name="scheduleType"]:checked')?.value || 'uniform';
    let weeklyHours = 0;
    
    if (scheduleType === 'uniform') {
        const startTime = document.getElementById('childcareUniformStart')?.value || '09:00';
        const endTime = document.getElementById('childcareUniformEnd')?.value || '16:00';
        const dailyHours = calculateWorkHoursBetween(startTime, endTime);
        weeklyHours = dailyHours * 5;  // 주 5일 기준
    } else {
        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
            const startTime = document.getElementById(`scheduleStart_${day}`)?.value;
            const endTime = document.getElementById(`scheduleEnd_${day}`)?.value;
            if (startTime && endTime) {
                weeklyHours += calculateWorkHoursBetween(startTime, endTime);
            }
        });
    }
    
    const originalHours = 40;
    const ratio = Math.round((weeklyHours / originalHours) * 100);
    
    const valueEl = document.getElementById('weeklyHoursValue');
    const changeEl = document.getElementById('weeklyHoursChange');
    
    if (valueEl) valueEl.textContent = weeklyHours;
    if (changeEl) changeEl.textContent = `기존 ${originalHours}시간 → ${weeklyHours}시간 (${ratio}%)`;
    
 // 범위 검증 (15~35시간)
    if (weeklyHours < 15 || weeklyHours > 35) {
        if (valueEl) valueEl.style.color = '#dc2626';
        if (changeEl) changeEl.innerHTML = `주당 근무시간은 <strong>15~35시간</strong> 범위여야 합니다.`;
    } else {
        if (valueEl) valueEl.style.color = '#4f46e5';
    }
}

/**
 * 육아기 단축근로 저장
 */
function saveChildcareReduction() {
    try {
        로거_인사?.info('육아기 단축근로 저장 시작');
        
 // 1. 데이터 수집
        const empId = document.getElementById('childcareEmployeeSelect')?.value;
        const childName = document.getElementById('childcareName')?.value?.trim();
        const childBirthDate = document.getElementById('childcareBirthDate')?.value;
        const childType = document.querySelector('input[name="childcareChildType"]:checked')?.value;
        const startDate = document.getElementById('childcareStartDate')?.value;
        const endDate = document.getElementById('childcareEndDate')?.value;
        const scheduleType = document.querySelector('input[name="scheduleType"]:checked')?.value;
        const recognitionRate = parseInt(document.getElementById('childcareRecognitionRate')?.value) || 100;
        const note = document.getElementById('childcareNote')?.value || '';
        
 // 2. 필수 입력 검증
        if (!empId) {
            alert('[주의] 직원을 선택해주세요.');
            return;
        }
        if (!childName || !childBirthDate) {
            alert('[주의] 자녀 정보를 입력해주세요.');
            return;
        }
        if (!startDate || !endDate) {
            alert('[주의] 단축 기간을 입력해주세요.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('[주의] 종료일은 시작일 이후여야 합니다.');
            return;
        }
        
 // 3. 자녀 연령 검증
        const ageValidation = _validateChildAge(childBirthDate, startDate);
        if (!ageValidation.valid) {
            alert(`[주의] ${ageValidation.message}`);
            return;
        }
        
 // 4. 근무시간 수집 및 검증
        let weeklyHours = 0;
        let schedule = null;
        let uniformSchedule = null;
        
        if (scheduleType === 'uniform') {
            const workStart = document.getElementById('childcareUniformStart')?.value || '09:00';
            const workEnd = document.getElementById('childcareUniformEnd')?.value || '16:00';
            const dailyHours = calculateWorkHoursBetween(workStart, workEnd);
            weeklyHours = dailyHours * 5;
            
            uniformSchedule = {
                workStart: workStart,
                workEnd: workEnd,
                dailyHours: dailyHours
            };
        } else {
            schedule = {};
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
                const startTime = document.getElementById(`scheduleStart_${day}`)?.value;
                const endTime = document.getElementById(`scheduleEnd_${day}`)?.value;
                
                if (startTime && endTime) {
                    const hours = calculateWorkHoursBetween(startTime, endTime);
                    schedule[day] = {
                        workStart: startTime,
                        workEnd: endTime,
                        hours: hours
                    };
                    weeklyHours += hours;
                } else {
                    schedule[day] = null;  // 근무 없는 날
                }
            });
        }
        
        if (weeklyHours < 15 || weeklyHours > 35) {
            alert('[주의] 주당 근무시간은 15~35시간 범위여야 합니다.');
            return;
        }
        
 // 5. 기간 중복 검증
        if (_checkPeriodOverlap(empId, 'childcare', startDate, endDate, editingReducedWorkId)) {
            alert('[주의] 해당 기간에 이미 등록된 육아기 단축근로가 있습니다.\n스케줄 변경 시 기존 이력을 종료하고 새로 등록해주세요.');
            return;
        }
        
 // 6. 데이터 구성
        const reductionData = {
            id: editingReducedWorkId || _generateReducedWorkId('childcare'),
            childName: childName,
            childBirthDate: childBirthDate,
            childType: childType,
            startDate: startDate,
            endDate: endDate,
            scheduleType: scheduleType,
            uniformSchedule: uniformSchedule,  // 균등: { workStart, workEnd, dailyHours }
            schedule: schedule,                // 요일별: { mon: {workStart, workEnd, hours}, ... }
            weeklyHours: weeklyHours,
            originalWeeklyHours: 40,
            recognitionRate: recognitionRate,
            overtimeAllowed: true,
            overtimeLimit: 12,
            note: note,
            createdAt: editingReducedWorkId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
 // 7. 저장
        const emp = db.findEmployee(empId);
        if (!emp) {
            throw new Error('직원 정보를 찾을 수 없습니다.');
        }
        
        if (!emp.reducedWork) {
            emp.reducedWork = { pregnancy: [], childcare: [], flexTime: [] };
        }
        if (!Array.isArray(emp.reducedWork.childcare)) {
            emp.reducedWork.childcare = [];
        }
        
        if (editingReducedWorkId) {
            const index = emp.reducedWork.childcare.findIndex(r => r.id === editingReducedWorkId);
            if (index !== -1) {
                reductionData.createdAt = emp.reducedWork.childcare[index].createdAt;
                emp.reducedWork.childcare[index] = reductionData;
            }
        } else {
            emp.reducedWork.childcare.push(reductionData);
        }
        
        db.saveEmployee(emp);
        
 // 8. UI 갱신
        loadChildcareReductionList();
        _resetChildcareForm();
        document.getElementById('childcareEmployeeSelect').value = '';
        document.getElementById('childcareFormFields').style.display = 'none';
        editingReducedWorkId = null;
        
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
        alert('육아기 단축근로가 등록되었습니다.');
        로거_인사?.info('육아기 단축근로 저장 완료', { empId, reductionData });
        
    } catch (error) {
        로거_인사?.error('육아기 단축근로 저장 오류', error);
        에러처리_인사?.handle(error, '육아기 단축근로 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 육아기 단축근로 목록 로드
 */
function loadChildcareReductionList() {
    try {
        const container = document.getElementById('childcareReductionList');
        if (!container) return;
        
        const allReductions = _getAllReducedWorkByType('childcare');
        
        if (allReductions.length === 0) {
            container.innerHTML = `
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 육아기 단축근로가 없습니다.</p>
                </div>
            `;
            return;
        }
        
 // 상태별 정렬: 진행중 > 예정 > 종료
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sortedReductions = allReductions.map(item => {
            const start = new Date(item.data.startDate);
            const end = new Date(item.data.endDate);
            let status, statusOrder;
            
            if (today > end) {
                status = 'ended';
                statusOrder = 3;
            } else if (today < start) {
                status = 'scheduled';
                statusOrder = 2;
            } else {
                status = 'active';
                statusOrder = 1;
            }
            
            return { ...item, status, statusOrder };
        }).sort((a, b) => a.statusOrder - b.statusOrder);
        
 // 테이블 HTML 생성
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #475569;">직원</th>
                        <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #475569;">자녀</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #475569;">기간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #475569;">근무시간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #475569;">비율</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #475569;">상태</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #475569;">관리</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedReductions.forEach((item, idx) => {
            const emp = db.findEmployee(item.empId);
            const empName = emp ? (typeof 직원유틸_인사 !== 'undefined' ? 직원유틸_인사.getDisplayName(emp) : (emp.personalInfo?.name || emp.name)) : '알 수 없음';
            const safeEmpName = DOM유틸_인사?.escapeHtml ? DOM유틸_인사.escapeHtml(empName) : empName;
            const safeChildName = DOM유틸_인사?.escapeHtml ? DOM유틸_인사.escapeHtml(item.data.childName) : item.data.childName;
            
            const ratio = Math.round((item.data.weeklyHours / item.data.originalWeeklyHours) * 100);
            
 // 근무시간 표시
            let workTimeText = '';
            if (item.data.scheduleType === 'uniform') {
                if (item.data.uniformSchedule) {
                    workTimeText = `${item.data.uniformSchedule.workStart}~${item.data.uniformSchedule.workEnd}`;
                } else if (item.data.uniformHours) {
                    workTimeText = `1일 ${item.data.uniformHours}h`;
                }
            } else {
                workTimeText = '요일별 차등';
            }
            
 // 상태 배지
            let statusBadge = '';
            let rowBgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            
            if (item.status === 'active') {
                statusBadge = '<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">진행중</span>';
            } else if (item.status === 'scheduled') {
                statusBadge = '<span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">예정</span>';
            } else {
                statusBadge = '<span style="background: #f3f4f6; color: #6b7280; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">종료</span>';
                rowBgColor = idx % 2 === 0 ? '#fafafa' : '#f5f5f5';
            }
            
            html += `
                <tr style="background: ${rowBgColor}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 8px; font-weight: 500;">${safeEmpName}</td>
                    <td style="padding: 12px 8px;">${safeChildName}</td>
                    <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #64748b;">
                        ${item.data.startDate}<br>~ ${item.data.endDate}
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <div style="font-weight: 500;">${workTimeText}</div>
                        <div style="font-size: 11px; color: #64748b;">주 ${item.data.weeklyHours}h</div>
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <span style="background: #2563eb15; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${ratio}%</span>
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <button class="btn btn-small" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="editChildcareReduction('${item.empId}', '${item.data.id}')">수정</button>
                        <button class="btn btn-small btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteChildcareReduction('${item.empId}', '${item.data.id}')">삭제</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        로거_인사?.error('육아기 단축근로 목록 로드 오류', error);
    }
}

/**
 * 육아기 단축근로 수정
 */
function editChildcareReduction(empId, id) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.childcare) return;
        
        const record = emp.reducedWork.childcare.find(r => r.id === id);
        if (!record) return;
        
        document.getElementById('childcareEmployeeSelect').value = empId;
        document.getElementById('childcareFormFields').style.display = 'block';
        
        document.getElementById('childcareName').value = record.childName || '';
        document.getElementById('childcareBirthDate').value = record.childBirthDate || '';
        
        const childTypeRadio = document.querySelector(`input[name="childcareChildType"][value="${record.childType}"]`);
        if (childTypeRadio) childTypeRadio.checked = true;
        
        document.getElementById('childcareStartDate').value = record.startDate;
        document.getElementById('childcareEndDate').value = record.endDate;
        
        selectScheduleType(record.scheduleType || 'uniform');
        
        if (record.scheduleType === 'uniform') {
 // 새 구조 또는 레거시 호환
            if (record.uniformSchedule) {
                document.getElementById('childcareUniformStart').value = record.uniformSchedule.workStart || '09:00';
                updateUniformEndTime();
                setTimeout(() => {
                    document.getElementById('childcareUniformEnd').value = record.uniformSchedule.workEnd || '16:00';
                    updateWeeklyHoursDisplay();
                }, 50);
            } else if (record.uniformHours) {
 // 레거시: uniformHours만 있는 경우
                document.getElementById('childcareUniformStart').value = '09:00';
                updateUniformEndTime();
                setTimeout(() => {
 // 시간에 맞는 퇴근시간 계산 (점심 포함)
                    const endHour = 9 + record.uniformHours + 1;
                    document.getElementById('childcareUniformEnd').value = `${String(endHour).padStart(2, '0')}:00`;
                    updateWeeklyHoursDisplay();
                }, 50);
            }
        } else if (record.schedule) {
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
                const startSelect = document.getElementById(`scheduleStart_${day}`);
                const endSelect = document.getElementById(`scheduleEnd_${day}`);
                
                const dayData = record.schedule[day];
                
                if (dayData && typeof dayData === 'object') {
 // 새 구조
                    if (startSelect) startSelect.value = dayData.workStart || '';
                    if (endSelect) endSelect.value = dayData.workEnd || '';
                } else if (typeof dayData === 'number') {
 // 레거시 (시간만 있는 경우)
                    if (startSelect) startSelect.value = '09:00';
                    if (endSelect) {
                        const endHour = 9 + dayData + 1;
                        endSelect.value = `${String(endHour).padStart(2, '0')}:00`;
                    }
                } else {
 // null인 경우
                    if (startSelect) startSelect.value = '';
                    if (endSelect) endSelect.value = '';
                }
                
                updateDailyHours(day);
            });
        }
        
        document.getElementById('childcareRecognitionRate').value = record.recognitionRate || 100;
        document.getElementById('childcareNote').value = record.note || '';
        
        updateWeeklyHoursDisplay();
        
        currentReducedWorkEmployeeId = empId;
        editingReducedWorkId = id;
        
        document.getElementById('childcareEmployeeSelect').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        로거_인사?.error('육아기 단축근로 수정 로드 오류', error);
    }
}

/**
 * 육아기 단축근로 삭제
 */
function deleteChildcareReduction(empId, id) {
    if (!confirm('[주의] 이 육아기 단축근로 기록을 삭제하시겠습니까?')) return;
    
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.childcare) return;
        
        emp.reducedWork.childcare = emp.reducedWork.childcare.filter(r => r.id !== id);
        db.saveEmployee(emp);
        
        loadChildcareReductionList();
        alert('삭제되었습니다.');
        
    } catch (error) {
        로거_인사?.error('육아기 단축근로 삭제 오류', error);
        에러처리_인사?.handle(error, '삭제 중 오류가 발생했습니다.');
    }
}

// ========================================
// 육아기 10시 출근제
// ========================================

/**
 * 10시 출근제 탭 HTML 생성
 * @private
 */
function _generateFlexTimeTabHTML() {
    return `
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 육아기 10시 출근제 등록</div>
            
            <div class="reduced-work-notice info">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>유아·초등학생 자녀를 둔 부모가 임금 삭감 없이 출퇴근 시간을 1시간 조정할 수 있는 제도입니다.<br>
                이 제도는 <strong>"시간 조정"</strong>으로, 총 근무시간(8시간)은 동일합니다. 조정된 퇴근시간 이후 근무 시 <strong>시간외수당이 정상 지급</strong>됩니다.</span>
            </div>
            
            <div class="form-group">
                <label>직원 선택 *</label>
                <select id="flexTimeEmployeeSelect" class="form-control" onchange="onFlexTimeEmployeeChange()">
                    <option value="">선택하세요</option>
                </select>
            </div>
            
            <div id="flexTimeFormFields" style="display: none;">
                <div class="card" style="background: #f9fafb; margin: 16px 0;">
                    <div class="card-title" style="font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg> 자녀 정보</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>자녀 이름 *</label>
                            <input type="text" id="flexTimeName" class="form-control" placeholder="자녀 이름">
                        </div>
                        <div class="form-group">
                            <label>자녀 생년월일 *</label>
                            <input type="date" id="flexTimeBirthDate" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>자녀 구분</label>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="flexTimeChildType" value="preschool" checked>
                                <span>유아 (미취학)</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="flexTimeChildType" value="elementary">
                                <span>초등학생</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>시작일 *</label>
                        <input type="date" id="flexTimeStartDate" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>종료일 * (최대 1년)</label>
                        <input type="date" id="flexTimeEndDate" class="form-control">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>시간 조정 방식 *</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="flexTimeType" value="late_start" checked onchange="updateFlexTimeDisplay()">
                            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg> 10시 출근 (09:00 → 10:00)</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="flexTimeType" value="early_end" onchange="updateFlexTimeDisplay()">
                            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="16 6 12 10 8 6"/></svg> 1시간 조기 퇴근 (18:00 → 17:00)</span>
                        </label>
                    </div>
                </div>
                
                <div class="weekly-hours-display" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                    <div class="weekly-hours-value" id="flexTimeHoursValue" style="color: #d97706;">8</div>
                    <div class="weekly-hours-label">시간 / 일 (변동 없음)</div>
                    <div class="weekly-hours-change" id="flexTimeSchedule">10:00 ~ 19:00 (점심시간 제외)</div>
                </div>
                
                <div class="form-group" style="margin-top: 16px;">
                    <label>비고</label>
                    <textarea id="flexTimeNote" class="form-control" rows="2" placeholder="특이사항 입력"></textarea>
                </div>
                
                <button class="btn btn-primary" style="width: 100%;" onclick="saveFlexTime()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 10시 출근제 등록
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> 10시 출근제 사용 현황</div>
            <div id="flexTimeList">
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 10시 출근제 사용 이력이 없습니다.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * 10시 출근제 직원 선택 목록 로드
 * @private
 */
function _loadFlexTimeEmployeeSelect() {
    try {
        const select = document.getElementById('flexTimeEmployeeSelect');
        if (!select) return;
        
        const employees = db.getActiveEmployees();
        
        select.innerHTML = '<option value="">선택하세요</option>';
        employees.forEach(emp => {
            const displayName = typeof 직원유틸_인사 !== 'undefined'
                ? 직원유틸_인사.getDisplayName(emp)
                : `${emp.personalInfo?.name || emp.name} (${emp.currentPosition?.dept || ''})`;
            select.innerHTML += `<option value="${emp.id}">${displayName}</option>`;
        });
        
    } catch (error) {
        로거_인사?.error('10시 출근제 직원 목록 로드 오류', error);
    }
}

/**
 * 10시 출근제 직원 선택 변경 시
 */
function onFlexTimeEmployeeChange() {
    const select = document.getElementById('flexTimeEmployeeSelect');
    const formFields = document.getElementById('flexTimeFormFields');
    
    if (select && formFields) {
        currentReducedWorkEmployeeId = select.value;
        formFields.style.display = select.value ? 'block' : 'none';
        
        editingReducedWorkId = null;
        _resetFlexTimeForm();
    }
}

/**
 * 10시 출근제 폼 초기화
 * @private
 */
function _resetFlexTimeForm() {
    document.getElementById('flexTimeName').value = '';
    document.getElementById('flexTimeBirthDate').value = '';
    document.querySelector('input[name="flexTimeChildType"][value="preschool"]')?.click();
    document.getElementById('flexTimeStartDate').value = '';
    document.getElementById('flexTimeEndDate').value = '';
    document.querySelector('input[name="flexTimeType"][value="late_start"]')?.click();
    document.getElementById('flexTimeNote').value = '';
    updateFlexTimeDisplay();
}

/**
 * 10시 출근제 근무시간 표시 업데이트
 */
function updateFlexTimeDisplay() {
    const flexType = document.querySelector('input[name="flexTimeType"]:checked')?.value;
    const scheduleEl = document.getElementById('flexTimeSchedule');
    
    if (scheduleEl) {
        if (flexType === 'late_start') {
            scheduleEl.textContent = '10:00 ~ 19:00 (점심시간 제외)';
        } else {
            scheduleEl.textContent = '09:00 ~ 17:00 (점심시간 제외)';
        }
    }
}

/**
 * 10시 출근제 저장
 */
function saveFlexTime() {
    try {
        로거_인사?.info('10시 출근제 저장 시작');
        
 // 1. 데이터 수집
        const empId = document.getElementById('flexTimeEmployeeSelect')?.value;
        const childName = document.getElementById('flexTimeName')?.value?.trim();
        const childBirthDate = document.getElementById('flexTimeBirthDate')?.value;
        const childType = document.querySelector('input[name="flexTimeChildType"]:checked')?.value;
        const startDate = document.getElementById('flexTimeStartDate')?.value;
        const endDate = document.getElementById('flexTimeEndDate')?.value;
        const flexType = document.querySelector('input[name="flexTimeType"]:checked')?.value;
        const note = document.getElementById('flexTimeNote')?.value || '';
        
 // 2. 필수 입력 검증
        if (!empId) {
            alert('[주의] 직원을 선택해주세요.');
            return;
        }
        if (!childName || !childBirthDate) {
            alert('[주의] 자녀 정보를 입력해주세요.');
            return;
        }
        if (!startDate || !endDate) {
            alert('[주의] 사용 기간을 입력해주세요.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('[주의] 종료일은 시작일 이후여야 합니다.');
            return;
        }
        
 // 3. 기간 검증 (최대 1년)
        const daysDiff = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff > 365) {
            if (!confirm('[주의] 10시 출근제는 최대 1년까지 사용 가능합니다.\n1년을 초과하는 기간으로 등록하시겠습니까?')) {
                return;
            }
        }
        
 // 4. 기간 중복 검증
        if (_checkPeriodOverlap(empId, 'flexTime', startDate, endDate, editingReducedWorkId)) {
            alert('[주의] 해당 기간에 이미 등록된 10시 출근제 사용 이력이 있습니다.');
            return;
        }
        
 // 5. 데이터 구성
 // 10시 출근제: 퇴근시간은 그대로, 출근만 1시간 늦춤 (09~10시 유급)
 // 조기 퇴근제: 출근시간은 그대로, 퇴근만 1시간 앞당김 (17~18시 유급)
        const workTimes = flexType === 'late_start' 
            ? { start: '10:00', end: '18:00' }   // 10시 출근, 18시 퇴근 (실근무 7h + 유급 1h)
            : { start: '09:00', end: '17:00' };  // 9시 출근, 17시 퇴근 (실근무 7h + 유급 1h)
        
        const flexTimeData = {
            id: editingReducedWorkId || _generateReducedWorkId('flexTime'),
            childName: childName,
            childBirthDate: childBirthDate,
            childType: childType,
            startDate: startDate,
            endDate: endDate,
            flexType: flexType,
            adjustmentHours: 1,
            workStart: workTimes.start,
            workEnd: workTimes.end,
            dailyHours: 8,
            overtimeEligible: true,
            note: note,
            createdAt: editingReducedWorkId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
 // 7. 저장
        const emp = db.findEmployee(empId);
        if (!emp) {
            throw new Error('직원 정보를 찾을 수 없습니다.');
        }
        
        if (!emp.reducedWork) {
            emp.reducedWork = { pregnancy: [], childcare: [], flexTime: [] };
        }
        if (!Array.isArray(emp.reducedWork.flexTime)) {
            emp.reducedWork.flexTime = [];
        }
        
        if (editingReducedWorkId) {
            const index = emp.reducedWork.flexTime.findIndex(r => r.id === editingReducedWorkId);
            if (index !== -1) {
                flexTimeData.createdAt = emp.reducedWork.flexTime[index].createdAt;
                emp.reducedWork.flexTime[index] = flexTimeData;
            }
        } else {
            emp.reducedWork.flexTime.push(flexTimeData);
        }
        
        db.saveEmployee(emp);
        
 // 8. UI 갱신
        loadFlexTimeList();
        _resetFlexTimeForm();
        document.getElementById('flexTimeEmployeeSelect').value = '';
        document.getElementById('flexTimeFormFields').style.display = 'none';
        editingReducedWorkId = null;
        
        if (typeof loadEmployeeList === 'function') {
            loadEmployeeList();
        }
        
        alert('10시 출근제가 등록되었습니다.');
        로거_인사?.info('10시 출근제 저장 완료', { empId, flexTimeData });
        
    } catch (error) {
        로거_인사?.error('10시 출근제 저장 오류', error);
        에러처리_인사?.handle(error, '10시 출근제 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 10시 출근제 목록 로드
 */
function loadFlexTimeList() {
    try {
        const container = document.getElementById('flexTimeList');
        if (!container) return;
        
        const allReductions = _getAllReducedWorkByType('flexTime');
        
        if (allReductions.length === 0) {
            container.innerHTML = `
                <div class="reduced-work-empty">
                    <div class="reduced-work-empty-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
                    <p>등록된 10시 출근제 사용 이력이 없습니다.</p>
                </div>
            `;
            return;
        }
        
 // 상태별 정렬: 진행중 > 예정 > 종료
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sortedReductions = allReductions.map(item => {
            const start = new Date(item.data.startDate);
            const end = new Date(item.data.endDate);
            let status, statusOrder;
            
            if (today > end) {
                status = 'ended';
                statusOrder = 3;
            } else if (today < start) {
                status = 'scheduled';
                statusOrder = 2;
            } else {
                status = 'active';
                statusOrder = 1;
            }
            
            return { ...item, status, statusOrder };
        }).sort((a, b) => a.statusOrder - b.statusOrder);
        
 // 테이블 HTML 생성
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #fffbeb; border-bottom: 2px solid #fde68a;">
                        <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #92400e;">직원</th>
                        <th style="padding: 10px 8px; text-align: left; font-weight: 600; color: #92400e;">자녀</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #92400e;">유형</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #92400e;">기간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #92400e;">근무시간</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #92400e;">상태</th>
                        <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #92400e;">관리</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedReductions.forEach((item, idx) => {
            const emp = db.findEmployee(item.empId);
            const empName = emp ? (typeof 직원유틸_인사 !== 'undefined' ? 직원유틸_인사.getDisplayName(emp) : (emp.personalInfo?.name || emp.name)) : '알 수 없음';
            const safeEmpName = DOM유틸_인사?.escapeHtml ? DOM유틸_인사.escapeHtml(empName) : empName;
            const safeChildName = DOM유틸_인사?.escapeHtml ? DOM유틸_인사.escapeHtml(item.data.childName) : item.data.childName;
            
            const flexTypeLabel = item.data.flexType === 'late_start' ? '10시 출근' : '조기 퇴근';
            const workTime = `${item.data.workStart}~${item.data.workEnd}`;
            
 // 상태 배지
            let statusBadge = '';
            let rowBgColor = idx % 2 === 0 ? '#ffffff' : '#fffbeb';
            
            if (item.status === 'active') {
                statusBadge = '<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">진행중</span>';
            } else if (item.status === 'scheduled') {
                statusBadge = '<span style="background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">예정</span>';
            } else {
                statusBadge = '<span style="background: #f3f4f6; color: #6b7280; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">종료</span>';
                rowBgColor = idx % 2 === 0 ? '#fafafa' : '#f5f5f5';
            }
            
            html += `
                <tr style="background: ${rowBgColor}; border-bottom: 1px solid #fef3c7;">
                    <td style="padding: 12px 8px; font-weight: 500;">${safeEmpName}</td>
                    <td style="padding: 12px 8px;">${safeChildName}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <span style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${flexTypeLabel}</span>
                    </td>
                    <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #64748b;">
                        ${item.data.startDate}<br>~ ${item.data.endDate}
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <div style="font-weight: 500;">${workTime}</div>
                        <div style="font-size: 11px; color: #059669;">실 7h + 유급 1h</div>
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <button class="btn btn-small" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="editFlexTime('${item.empId}', '${item.data.id}')">수정</button>
                        <button class="btn btn-small btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteFlexTime('${item.empId}', '${item.data.id}')">삭제</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        로거_인사?.error('10시 출근제 목록 로드 오류', error);
    }
}

/**
 * 10시 출근제 수정
 */
function editFlexTime(empId, id) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.flexTime) return;
        
        const record = emp.reducedWork.flexTime.find(r => r.id === id);
        if (!record) return;
        
        document.getElementById('flexTimeEmployeeSelect').value = empId;
        document.getElementById('flexTimeFormFields').style.display = 'block';
        
        document.getElementById('flexTimeName').value = record.childName || '';
        document.getElementById('flexTimeBirthDate').value = record.childBirthDate || '';
        
        const childTypeRadio = document.querySelector(`input[name="flexTimeChildType"][value="${record.childType}"]`);
        if (childTypeRadio) childTypeRadio.checked = true;
        
        document.getElementById('flexTimeStartDate').value = record.startDate;
        document.getElementById('flexTimeEndDate').value = record.endDate;
        
        const flexTypeRadio = document.querySelector(`input[name="flexTimeType"][value="${record.flexType}"]`);
        if (flexTypeRadio) flexTypeRadio.checked = true;
        
        document.getElementById('flexTimeNote').value = record.note || '';
        
        updateFlexTimeDisplay();
        
        currentReducedWorkEmployeeId = empId;
        editingReducedWorkId = id;
        
        document.getElementById('flexTimeEmployeeSelect').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        로거_인사?.error('10시 출근제 수정 로드 오류', error);
    }
}

/**
 * 10시 출근제 삭제
 */
function deleteFlexTime(empId, id) {
    if (!confirm('[주의] 이 10시 출근제 기록을 삭제하시겠습니까?')) return;
    
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork?.flexTime) return;
        
        emp.reducedWork.flexTime = emp.reducedWork.flexTime.filter(r => r.id !== id);
        db.saveEmployee(emp);
        
        loadFlexTimeList();
        alert('삭제되었습니다.');
        
    } catch (error) {
        로거_인사?.error('10시 출근제 삭제 오류', error);
        에러처리_인사?.handle(error, '삭제 중 오류가 발생했습니다.');
    }
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 단축근로 ID 생성
 * @private
 */
function _generateReducedWorkId(type) {
    const prefix = {
        pregnancy: 'preg',
        childcare: 'child',
        flexTime: 'flex'
    };
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix[type] || 'rw'}-${timestamp}-${random}`;
}

/**
 * 기간 중복 체크
 * @private
 */
function _checkPeriodOverlap(empId, type, startDate, endDate, excludeId = null) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork || !emp.reducedWork[type]) return false;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return emp.reducedWork[type].some(record => {
            if (excludeId && record.id === excludeId) return false;
            
            const recordStart = new Date(record.startDate);
            const recordEnd = new Date(record.endDate);
            
            return !(end < recordStart || start > recordEnd);
        });
    } catch (error) {
        로거_인사?.error('기간 중복 체크 오류', error);
        return false;
    }
}

/**
 * 자녀 연령 검증
 * @private
 */
function _validateChildAge(childBirthDate, startDate) {
    try {
        const birth = new Date(childBirthDate);
        const start = new Date(startDate);
        
        let age = start.getFullYear() - birth.getFullYear();
        const monthDiff = start.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && start.getDate() < birth.getDate())) {
            age--;
        }
        
        if (age > 12) {
            return { valid: false, message: '만 12세 이하 자녀만 대상입니다.' };
        }
        
        return { valid: true };
    } catch (error) {
        return { valid: true };  // 검증 오류 시 통과
    }
}

/**
 * 근무시간 계산 (임신기)
 * @private
 * 
 * @description
 * 기본 근무시간: 09:00~18:00 (점심 12:00~13:00 제외 = 8시간)
 * 임신기 단축: 2시간 단축 → 6시간 근무
 */
function _calculateWorkHours(method) {
    switch (method) {
        case 'late_start':
 // 출근 2시간 늦춤: 11:00~18:00 (점심 제외 6시간)
            return { start: '11:00', end: '18:00' };
        case 'early_end':
 // 퇴근 2시간 앞당김: 09:00~16:00 (점심 제외 6시간)
            return { start: '09:00', end: '16:00' };
        case 'both':
 // 출퇴근 각 1시간 조정: 10:00~17:00 (점심 제외 6시간)
            return { start: '10:00', end: '17:00' };
        default:
            return { start: '11:00', end: '18:00' };
    }
}

/**
 * 특정 유형의 모든 단축근로 조회
 * @private
 */
function _getAllReducedWorkByType(type) {
    const results = [];
    const employees = db.getEmployees();
    
    employees.forEach(emp => {
        if (emp.reducedWork && Array.isArray(emp.reducedWork[type])) {
            emp.reducedWork[type].forEach(record => {
                results.push({
                    empId: emp.id,
                    empName: emp.personalInfo?.name || emp.name,
                    data: record
                });
            });
        }
    });
    
 // 시작일 기준 내림차순 정렬
    results.sort((a, b) => new Date(b.data.startDate) - new Date(a.data.startDate));
    
    return results;
}

// ========================================
// 급여 시스템 연동용 API
// ========================================

/**
 * 특정 날짜에 적용되는 단축근로 정보 조회
 * @param {string} empId - 직원 ID
 * @param {string} date - 조회 날짜 (YYYY-MM-DD)
 * @returns {object|null} 적용 중인 단축근로 정보
 */
function getActiveReducedWork(empId, date) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork) return null;
        
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const dayName = DAY_NAMES[dayOfWeek];
        
        const baseDaily = emp.weeklyWorkHours ? emp.weeklyWorkHours / 5 : 8;
        
 // 1. 임신기 단축근로 확인 (우선순위 높음)
        const pregnancy = emp.reducedWork.pregnancy?.find(r => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            return targetDate >= start && targetDate <= end;
        });
        
        if (pregnancy) {
            return {
                type: 'pregnancy',
                data: pregnancy,
                ratio: 1.0,
                overtimeAllowed: false,
                nightWorkAllowed: false,
                holidayWorkAllowed: false,
                dailyHours: pregnancy.reducedHours || (baseDaily - 2)
            };
        }
        
 // 2. 육아기 단축근로 확인
        const childcare = emp.reducedWork.childcare?.find(r => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            return targetDate >= start && targetDate <= end;
        });
        
        if (childcare) {
            let dailyHours = baseDaily;
            let workStart = '09:00';
            let workEnd = '18:00';
            
            if (childcare.scheduleType === 'daily' && childcare.schedule) {
 // 요일별 스케줄
                const dayData = childcare.schedule[dayName];
                if (dayData && typeof dayData === 'object') {
 // 새 구조
                    dailyHours = dayData.hours || 0;
                    workStart = dayData.workStart || '09:00';
                    workEnd = dayData.workEnd || '18:00';
                } else if (typeof dayData === 'number') {
 // 레거시
                    dailyHours = dayData;
                    workEnd = `${String(9 + dayData + 1).padStart(2, '0')}:00`;
                } else {
                    dailyHours = 0;  // 근무 없는 날
                }
            } else if (childcare.uniformSchedule) {
 // 새 구조: 균등
                dailyHours = childcare.uniformSchedule.dailyHours || 6;
                workStart = childcare.uniformSchedule.workStart || '09:00';
                workEnd = childcare.uniformSchedule.workEnd || '16:00';
            } else if (childcare.uniformHours) {
 // 레거시
                dailyHours = childcare.uniformHours;
                workEnd = `${String(9 + dailyHours + 1).padStart(2, '0')}:00`;
            }
            
            return {
                type: 'childcare',
                data: childcare,
                ratio: childcare.weeklyHours / childcare.originalWeeklyHours,
                overtimeAllowed: true,
                overtimeLimit: 12,
                dailyHours: dailyHours,
                workStart: workStart,
                workEnd: workEnd,
                recognitionRate: childcare.recognitionRate || 100
            };
        }
        
 // 3. 10시 출근제 확인
        const flexTime = emp.reducedWork.flexTime?.find(r => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            return targetDate >= start && targetDate <= end;
        });
        
        if (flexTime) {
            return {
                type: 'flexTime',
                data: flexTime,
                ratio: 1.0,
                overtimeAllowed: true,
                dailyHours: flexTime.dailyHours || baseDaily,
                workStart: flexTime.workStart,
                workEnd: flexTime.workEnd
            };
        }
        
        return null;
    } catch (error) {
        로거_인사?.error('단축근로 조회 오류', { empId, date, error });
        return null;
    }
}

/**
 * 특정 월의 급여 비율 계산 (일할 계산 포함)
 * @param {string} empId - 직원 ID
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {object} 급여 계산 정보
 */
function calculateMonthlyPayRatio(empId, year, month) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp) return { ratio: 1.0, details: [], error: '직원 정보 없음' };
        
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        const totalDays = monthEnd.getDate();
        
        const details = [];
        let weightedRatio = 0;
        let processedDays = 0;
        
 // 육아기 단축근로만 급여에 비례 영향
        const childcareRecords = emp.reducedWork?.childcare || [];
        
        for (const record of childcareRecords) {
            const recordStart = new Date(record.startDate);
            const recordEnd = new Date(record.endDate);
            
            const overlapStart = new Date(Math.max(monthStart.getTime(), recordStart.getTime()));
            const overlapEnd = new Date(Math.min(monthEnd.getTime(), recordEnd.getTime()));
            
            if (overlapStart <= overlapEnd) {
                const overlapDays = Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                const ratio = record.weeklyHours / record.originalWeeklyHours;
                
                weightedRatio += ratio * overlapDays;
                processedDays += overlapDays;
                
                details.push({
                    type: 'childcare',
                    childName: record.childName || '',
                    startDate: overlapStart.toISOString().split('T')[0],
                    endDate: overlapEnd.toISOString().split('T')[0],
                    days: overlapDays,
                    weeklyHours: record.weeklyHours,
                    originalWeeklyHours: record.originalWeeklyHours,
                    ratio: Math.round(ratio * 10000) / 10000
                });
            }
        }
        
        const normalDays = totalDays - processedDays;
        weightedRatio += 1.0 * normalDays;
        
        const finalRatio = weightedRatio / totalDays;
        
        return {
            year,
            month,
            totalDays,
            normalDays,
            reducedDays: processedDays,
            ratio: Math.round(finalRatio * 10000) / 10000,
            details
        };
    } catch (error) {
        로거_인사?.error('월간 급여 비율 계산 오류', { empId, year, month, error });
        return { ratio: 1.0, details: [], error: error.message };
    }
}

/**
 * 특정 날짜의 소정근로시간 조회
 * @param {string} empId - 직원 ID
 * @param {string} date - 조회 날짜 (YYYY-MM-DD)
 * @returns {number} 해당 날짜의 소정근로시간 (시간)
 */
function getDailyWorkHours(empId, date) {
    const emp = db.findEmployee(empId);
    if (!emp) return 8;
    
    const baseHours = emp.weeklyWorkHours ? emp.weeklyWorkHours / 5 : 8;
    
    const reducedWork = getActiveReducedWork(empId, date);
    if (!reducedWork) return baseHours;
    
    return reducedWork.dailyHours;
}

/**
 * 기간 내 단축근로 요약 정보
 * @param {string} empId - 직원 ID
 * @param {string} startDate - 시작일 (YYYY-MM-DD)
 * @param {string} endDate - 종료일 (YYYY-MM-DD)
 * @returns {object} 요약 정보
 */
function getReducedWorkSummary(empId, startDate, endDate) {
    try {
        const emp = db.findEmployee(empId);
        if (!emp || !emp.reducedWork) {
            return { hasReducedWork: false, types: [], periods: [] };
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const periods = [];
        const typesSet = new Set();
        
        const allTypes = ['pregnancy', 'childcare', 'flexTime'];
        
        for (const type of allTypes) {
            const records = emp.reducedWork[type] || [];
            
            for (const record of records) {
                const recordStart = new Date(record.startDate);
                const recordEnd = new Date(record.endDate);
                
                if (recordEnd >= start && recordStart <= end) {
                    typesSet.add(type);
                    
                    const overlapStart = new Date(Math.max(start.getTime(), recordStart.getTime()));
                    const overlapEnd = new Date(Math.min(end.getTime(), recordEnd.getTime()));
                    
                    let ratio = 1.0;
                    if (type === 'childcare') {
                        ratio = record.weeklyHours / record.originalWeeklyHours;
                    }
                    
                    periods.push({
                        type,
                        startDate: overlapStart.toISOString().split('T')[0],
                        endDate: overlapEnd.toISOString().split('T')[0],
                        originalStartDate: record.startDate,
                        originalEndDate: record.endDate,
                        ratio,
                        data: record
                    });
                }
            }
        }
        
        let totalReducedDays = 0;
        let weightedRatioSum = 0;
        
        for (const period of periods) {
            const days = Math.floor(
                (new Date(period.endDate) - new Date(period.startDate)) / (1000 * 60 * 60 * 24)
            ) + 1;
            totalReducedDays += days;
            weightedRatioSum += period.ratio * days;
        }
        
        const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const averageRatio = totalReducedDays > 0 
            ? (weightedRatioSum + (totalDays - totalReducedDays)) / totalDays 
            : 1.0;
        
        return {
            hasReducedWork: periods.length > 0,
            types: Array.from(typesSet),
            periods,
            totalDays,
            totalReducedDays,
            normalDays: totalDays - totalReducedDays,
            averageRatio: Math.round(averageRatio * 10000) / 10000
        };
    } catch (error) {
        로거_인사?.error('단축근로 요약 조회 오류', { empId, startDate, endDate, error });
        return { hasReducedWork: false, types: [], periods: [], error: error.message };
    }
}

// ========================================
// 직원 데이터 구조 보장
// ========================================

/**
 * 직원 데이터에 reducedWork 구조 보장
 * @param {object} emp - 직원 객체
 * @returns {object} reducedWork 구조가 보장된 직원 객체
 */
function ensureReducedWorkStructure(emp) {
    if (!emp) return emp;
    
    if (!emp.reducedWork) {
        emp.reducedWork = {
            pregnancy: [],
            childcare: [],
            flexTime: []
        };
    }
    
    if (!Array.isArray(emp.reducedWork.pregnancy)) {
        emp.reducedWork.pregnancy = [];
    }
    if (!Array.isArray(emp.reducedWork.childcare)) {
        emp.reducedWork.childcare = [];
    }
    if (!Array.isArray(emp.reducedWork.flexTime)) {
        emp.reducedWork.flexTime = [];
    }
    
    return emp;
}

// 로드 완료 로그
로거_인사?.info('단축근로_인사.js 로드 완료', { version: '1.0' });
