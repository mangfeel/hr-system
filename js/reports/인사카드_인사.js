/**
 * 인사카드_인사.js - 직원 프로필 카드 생성
 * 
 * 기준일 기반 직원 프로필 카드 생성 및 인쇄
 * - 사진 포함형 / 텍스트형 양식
 * - 기관장/부기관장 단독 페이지
 * - 부서별 페이지 (팀장 + 팀원)
 * - 개별 직원 상세 카드
 * - 겸직/직무대리 반영
 * - 육아휴직자 포함/제외
 * - 인쇄 최적화
 * 
 * @version 5.0.0
 * @since 2025-11-28
 * @updated 2026-01-07 - 출력 범위 변경 시 기존 페이지 초기화 (전체→개별 전환 버그 수정)
 * @updated 2025-12-11 - 텍스트형 단독 카드에 포상이력 추가
 * @updated 2025-12-11 - 개별 직원 인사카드 페이지 제목 제거 (이름 중복 방지)
 * @updated 2025-12-11 - 2단 서식 옵션 추가 (인사이력/포상이력/경력사항 2열 배치)
 * 
 * [변경 이력]
 * v5.0.0 (2026-01-22) ⭐ API 전용 버전
 *   - 호봉 계산에서 저장된 값 사용 (정렬/데이터 표시)
 *   - _calculateRankAtDate async로 변경
 *
 * v4.0.0 (2026-01-21) API 연동 버전
 *   - 변수 중복 선언 버그 수정 (startRank → fallbackStartRank)
 * 
 * v1.4.0 (2026-01-07) - 출력 범위/직원 선택 변경 시 인쇄 버그 수정
 *   - 문제: "전체"로 인쇄 후 "개별 직원"으로 변경해도 계속 "전체"가 출력됨
 *   - 문제: 개별 직원 A 선택 후 B로 변경해도 A가 출력됨
 *   - 원인: 출력 범위/체크박스 변경 시 _generatedPages가 초기화되지 않음
 *   - 해결: onProfileCardRangeChange(), onEmployeeCheckboxChange()에서 초기화
 *   - onEmployeeCheckboxChange() 함수 추가
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 직원유틸_인사.js (직원유틸_인사)
 * - 호봉계산기_인사.js (RankCalculator, DateUtils, TenureCalculator)
 * - 인쇄유틸_인사.js (인쇄유틸_인사)
 * - 겸직관리_인사.js (getActiveConcurrentPositions)
 * - 조직도설정_인사.js (loadOrgChartSettings)
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 */

// ===== 상수 정의 =====

/**
 * 인사카드 설정
 * @constant {Object}
 */
const PROFILE_CARD_CONFIG = {
    // 카드 유형
    CARD_TYPES: {
        PHOTO: 'photo',
        TEXT: 'text'
    },
    
    // 출력 범위
    OUTPUT_RANGES: {
        ALL: 'all',
        EXECUTIVES: 'executives',
        DEPARTMENT: 'department',
        INDIVIDUAL: 'individual'
    },
    
    // 직위 역할 (조직도설정과 연동)
    POSITION_ROLES: {
        DIRECTOR: 'director',       // 기관장
        VICE_DIRECTOR: 'viceDirector', // 부기관장
        DEPT_HEAD: 'deptHead',      // 부서장
        STAFF: 'staff'              // 팀원
    },
    
    // 페이지당 팀원 수 (부서별 카드)
    MEMBERS_PER_PAGE: 6
};

// ===== 전역 변수 =====

/**
 * 현재 선택된 사진 맵
 * @type {Map<string, string>}
 */
let _photoMap = new Map();

/**
 * 현재 생성된 페이지 데이터
 * @type {Array}
 */
let _generatedPages = [];

// ===== 유틸리티 함수 =====

/**
 * 마지막 사용 폴더 메시지 반환
 * @private
 * @returns {string} 상태 메시지 HTML
 */
function _getLastPhotoFolderMessage() {
    const lastFolder = localStorage.getItem('profileCard_lastPhotoFolder');
    if (lastFolder) {
        return `<span style="color:#6b7280;">📂 이전 폴더: ${lastFolder} (다시 선택 필요)</span>`;
    }
    return '사진 폴더를 선택하세요';
}

// ===== 모듈 로드 =====

/**
 * 인사카드 모듈 로드
 */
function loadProfileCardModule() {
    try {
        로거_인사?.debug('인사카드 모듈 로드 시작');
        
        const container = document.getElementById('module-profile-card');
        if (!container) {
            로거_인사?.warn('인사카드 모듈 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        container.innerHTML = _renderProfileCardUI();
        
        // 초기값 설정
        _setDefaultValues();
        
        로거_인사?.info('인사카드 모듈 로드 완료');
        
    } catch (error) {
        로거_인사?.error('인사카드 모듈 로드 오류', error);
        에러처리_인사?.handle(error, '인사카드 모듈을 로드하는 중 오류가 발생했습니다.');
    }
}

/**
 * 기본값 설정
 * @private
 */
function _setDefaultValues() {
    // 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('profile-card-date');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // 부서 목록 로드
    _loadDepartmentOptions();
    
    // 직원 목록 로드
    _loadEmployeeOptions();
}

/**
 * 부서 목록 로드
 * @private
 */
function _loadDepartmentOptions() {
    try {
        const employees = db.getActiveEmployees();
        const deptSet = new Set();
        
        employees.forEach(emp => {
            const dept = 직원유틸_인사?.getDepartment?.(emp) || 
                        emp.currentPosition?.dept || 
                        emp.department || '';
            if (dept) {
                deptSet.add(dept);
            }
        });
        
        const departments = Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'ko'));
        
        const select = document.getElementById('profile-card-department');
        if (select) {
            // 기존 부서 옵션 제거 (전체, 기관장/부기관장, 개별 직원 유지)
            const existingOptions = select.querySelectorAll('option[data-type="department"]');
            existingOptions.forEach(opt => opt.remove());
            
            // 부서 옵션 추가
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = `dept:${dept}`;
                option.textContent = `📁 ${dept}`;
                option.dataset.type = 'department';
                select.appendChild(option);
            });
        }
        
    } catch (error) {
        로거_인사?.error('부서 목록 로드 오류', error);
    }
}

/**
 * 직원 목록 로드 (개별 선택용)
 * @private
 */
function _loadEmployeeOptions() {
    try {
        const baseDate = document.getElementById('profile-card-date')?.value || 
                        new Date().toISOString().split('T')[0];
        
        const employees = db.getEmployeesAtDate(baseDate);
        
        const container = document.getElementById('profile-card-employee-list');
        if (!container) return;
        
        // 직위 우선순위 로드
        const settings = typeof loadOrgChartSettings === 'function' ? loadOrgChartSettings() : null;
        const positionOrder = settings?.positionSettings || [];
        
        // 정렬: 부서 → 직위 우선순위 → 이름
        employees.sort((a, b) => {
            const deptA = 직원유틸_인사?.getDepartment?.(a) || a.currentPosition?.dept || '';
            const deptB = 직원유틸_인사?.getDepartment?.(b) || b.currentPosition?.dept || '';
            
            if (deptA !== deptB) {
                return deptA.localeCompare(deptB, 'ko');
            }
            
            const posA = 직원유틸_인사?.getPosition?.(a) || a.currentPosition?.position || '';
            const posB = 직원유틸_인사?.getPosition?.(b) || b.currentPosition?.position || '';
            
            const orderA = positionOrder.find(p => p.position === posA)?.order ?? 999;
            const orderB = positionOrder.find(p => p.position === posB)?.order ?? 999;
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            const nameA = 직원유틸_인사?.getName?.(a) || a.personalInfo?.name || '';
            const nameB = 직원유틸_인사?.getName?.(b) || b.personalInfo?.name || '';
            
            return nameA.localeCompare(nameB, 'ko');
        });
        
        let html = '';
        employees.forEach(emp => {
            const id = emp.id;
            const name = 직원유틸_인사?.getName?.(emp) || emp.personalInfo?.name || '';
            const dept = 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '';
            const position = 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
            
            const safeName = DOM유틸_인사?.escapeHtml?.(name) || name;
            const safeDept = DOM유틸_인사?.escapeHtml?.(dept) || dept;
            const safePosition = DOM유틸_인사?.escapeHtml?.(position) || position;
            
            html += `
                <label class="employee-checkbox-item">
                    <input type="checkbox" name="profile-card-employees" value="${id}" onchange="onEmployeeCheckboxChange()">
                    <span class="employee-info">
                        <strong>${safeName}</strong>
                        <span class="employee-detail">${safeDept} / ${safePosition}</span>
                    </span>
                </label>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        로거_인사?.error('직원 목록 로드 오류', error);
    }
}

// ===== UI 렌더링 =====

/**
 * 인사카드 UI 렌더링
 * @private
 * @returns {string} HTML
 */
function _renderProfileCardUI() {
    return `
        <div class="profile-card-container">
            <div class="card">
                <div class="card-title">📇 인사카드 생성</div>
                
                <div class="profile-card-form">
                    <!-- 기준일 -->
                    <div class="form-row">
                        <label class="form-label">기준일</label>
                        <input type="date" id="profile-card-date" class="form-input" 
                               onchange="onProfileCardDateChange()">
                    </div>
                    
                    <!-- 출력 범위 -->
                    <div class="form-row">
                        <label class="form-label">출력 범위</label>
                        <select id="profile-card-range" class="form-input" onchange="onProfileCardRangeChange()">
                            <option value="all">📋 전체 (기관장 + 모든 부서)</option>
                            <option value="executives">👔 기관장/부기관장만</option>
                            <optgroup label="── 부서별 ──" id="profile-card-department">
                            </optgroup>
                            <option value="individual">👤 개별 직원 선택</option>
                        </select>
                    </div>
                    
                    <!-- 개별 직원 선택 (조건부 표시) -->
                    <div id="profile-card-individual-section" class="form-row" style="display:none;">
                        <label class="form-label">직원 선택</label>
                        <div class="employee-search-box">
                            <input type="text" id="profile-card-employee-search" 
                                   class="form-input" placeholder="🔍 이름으로 검색..."
                                   oninput="filterEmployeeList(this.value)">
                        </div>
                        <div id="profile-card-employee-list" class="employee-checkbox-list">
                            <!-- 동적 생성 -->
                        </div>
                        <div class="employee-selection-info">
                            선택됨: <span id="profile-card-selected-count">0</span>명
                            <button type="button" class="btn btn-small btn-secondary" onclick="toggleAllEmployees(true)">전체선택</button>
                            <button type="button" class="btn btn-small btn-secondary" onclick="toggleAllEmployees(false)">전체해제</button>
                        </div>
                    </div>
                    
                    <!-- 양식 선택 -->
                    <div class="form-row">
                        <label class="form-label">양식</label>
                        <div class="card-type-selector">
                            <label class="card-type-option selected" data-type="photo" onclick="selectCardType('photo')">
                                <div class="card-type-preview photo-preview">
                                    <div class="preview-photo">📷</div>
                                    <div class="preview-info">
                                        <div class="preview-name">홍길동</div>
                                        <div class="preview-position">팀장</div>
                                    </div>
                                </div>
                                <div class="card-type-label">
                                    <input type="radio" name="card-type" value="photo" checked>
                                    사진 포함형
                                </div>
                            </label>
                            <label class="card-type-option" data-type="text" onclick="selectCardType('text')">
                                <div class="card-type-preview text-preview">
                                    <div class="preview-text-name">홍길동</div>
                                    <div class="preview-text-position">경영지원팀 팀장</div>
                                    <div class="preview-text-info">───────</div>
                                </div>
                                <div class="card-type-label">
                                    <input type="radio" name="card-type" value="text">
                                    텍스트형
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 사진 폴더 선택 (조건부 표시) -->
                    <div id="profile-card-photo-section" class="form-row">
                        <label class="form-label">사진 폴더</label>
                        <div class="photo-folder-selector">
                            <input type="file" id="profile-card-photo-folder" 
                                   webkitdirectory multiple 
                                   onchange="handlePhotoFolderSelect(this.files)"
                                   style="display:none;">
                            <button type="button" class="btn btn-secondary" 
                                    onclick="document.getElementById('profile-card-photo-folder').click()">
                                📁 폴더 선택...
                            </button>
                            <span id="profile-card-photo-status" class="photo-status">
                                ${_getLastPhotoFolderMessage()}
                            </span>
                        </div>
                        <p class="form-hint">💡 폴더 내 "성명.jpg" 또는 "성명.png" 파일을 자동 매칭합니다. (자동 리사이징 적용)</p>
                    </div>
                    
                    <!-- 옵션 -->
                    <div class="form-row">
                        <label class="form-label">옵션</label>
                        <div class="options-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="profile-card-concurrent" checked>
                                <span>👥 겸직/직무대리 반영</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="profile-card-maternity">
                                <span>🤱 육아휴직자 포함</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="profile-card-continuous-service">
                                <span>🔗 연속근무자 이력 통합</span>
                            </label>
                            <label class="checkbox-label" id="profile-card-two-column-wrapper" style="display:none;">
                                <input type="checkbox" id="profile-card-two-column">
                                <span>📑 2단 서식 (이력을 나란히 표시)</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 버튼 -->
                    <div class="form-actions">
                        <button type="button" class="btn btn-primary btn-large" onclick="previewProfileCards()">
                            👁️ 미리보기
                        </button>
                        <button type="button" class="btn btn-success btn-large" onclick="printProfileCards()">
                            🖨️ 인쇄
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 미리보기 영역 -->
            <div id="profile-card-preview" class="profile-card-preview" style="display:none;">
                <div class="preview-header">
                    <h3>📄 미리보기</h3>
                    <span id="profile-card-page-info"></span>
                </div>
                <div id="profile-card-preview-content" class="preview-content">
                    <!-- 동적 생성 -->
                </div>
            </div>
        </div>
    `;
}

// ===== 이벤트 핸들러 =====

/**
 * 기준일 변경 시
 */
function onProfileCardDateChange() {
    _loadEmployeeOptions();
}

/**
 * 출력 범위 변경 시
 */
function onProfileCardRangeChange() {
    const range = document.getElementById('profile-card-range')?.value || 'all';
    const individualSection = document.getElementById('profile-card-individual-section');
    const twoColumnWrapper = document.getElementById('profile-card-two-column-wrapper');
    
    // ⭐ [v1.4.0] 출력 범위 변경 시 기존 생성된 페이지 초기화
    _generatedPages = [];
    
    // 미리보기 영역도 초기화
    const previewArea = document.getElementById('profile-card-preview');
    if (previewArea) {
        previewArea.innerHTML = '<div class="preview-placeholder">미리보기를 클릭하면 여기에 표시됩니다.</div>';
    }
    
    if (range === 'individual') {
        if (individualSection) individualSection.style.display = 'block';
        if (twoColumnWrapper) twoColumnWrapper.style.display = 'block';
    } else {
        if (individualSection) individualSection.style.display = 'none';
        if (twoColumnWrapper) twoColumnWrapper.style.display = 'none';
        // 개별 직원이 아닐 때 2단 서식 체크 해제
        const twoColumnCheckbox = document.getElementById('profile-card-two-column');
        if (twoColumnCheckbox) twoColumnCheckbox.checked = false;
    }
}

/**
 * ⭐ [v1.4.0] 직원 체크박스 변경 시 페이지 초기화
 * 
 * 개별 직원 선택이 변경되면 기존 생성된 페이지를 초기화하여
 * 인쇄 시 변경된 선택이 반영되도록 합니다.
 */
function onEmployeeCheckboxChange() {
    // 기존 생성된 페이지 초기화
    _generatedPages = [];
    
    // 미리보기 영역도 초기화
    const previewArea = document.getElementById('profile-card-preview');
    if (previewArea) {
        previewArea.innerHTML = '<div class="preview-placeholder">미리보기를 클릭하면 여기에 표시됩니다.</div>';
    }
}

/**
 * 카드 유형 선택
 * @param {string} type - 'photo' 또는 'text'
 */
function selectCardType(type) {
    // 선택 상태 업데이트
    document.querySelectorAll('.card-type-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selected = document.querySelector(`.card-type-option[data-type="${type}"]`);
    if (selected) {
        selected.classList.add('selected');
        selected.querySelector('input[type="radio"]').checked = true;
    }
    
    // 사진 폴더 섹션 표시/숨김
    const photoSection = document.getElementById('profile-card-photo-section');
    if (photoSection) {
        photoSection.style.display = type === 'photo' ? 'block' : 'none';
    }
}

/**
 * 사진 폴더 선택 처리
 * @param {FileList} files - 선택된 파일들
 */
async function handlePhotoFolderSelect(files) {
    try {
        _photoMap.clear();
        
        if (!files || files.length === 0) {
            document.getElementById('profile-card-photo-status').textContent = '사진 폴더를 선택하세요';
            return;
        }
        
        // 로딩 표시
        const statusEl = document.getElementById('profile-card-photo-status');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#6b7280;">⏳ 사진 로딩 중...</span>`;
        }
        
        let matchedCount = 0;
        let folderPath = '';
        
        for (const file of files) {
            // 이미지 파일만 처리
            if (!file.type.startsWith('image/')) continue;
            
            // 폴더 경로 저장 (첫 번째 파일에서)
            if (!folderPath && file.webkitRelativePath) {
                folderPath = file.webkitRelativePath.split('/')[0];
            }
            
            // 파일명에서 이름 추출 (확장자 제거)
            const fileName = file.name;
            const name = fileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
            
            // 이미지 리사이징 후 Blob URL 생성
            const resizedUrl = await _resizeImage(file, 200);  // 가로 200px로 리사이징
            _photoMap.set(name, resizedUrl);
            matchedCount++;
            
            // 진행 상황 업데이트
            if (statusEl && matchedCount % 5 === 0) {
                statusEl.innerHTML = `<span style="color:#6b7280;">⏳ ${matchedCount}개 처리 중...</span>`;
            }
        }
        
        // 폴더 경로 저장 (localStorage)
        if (folderPath) {
            localStorage.setItem('profileCard_lastPhotoFolder', folderPath);
            console.log('[인사카드] 사진 폴더 경로 저장:', folderPath);
        }
        
        // 상태 업데이트
        if (statusEl) {
            if (matchedCount > 0) {
                statusEl.innerHTML = `<span style="color:#10b981;">✓ ${matchedCount}개 사진 로드됨 (${folderPath || '폴더'})</span>`;
            } else {
                statusEl.innerHTML = `<span style="color:#f59e0b;">⚠️ 이미지 파일이 없습니다</span>`;
            }
        }
        
        로거_인사?.info('사진 폴더 로드 완료', { matchedCount, folderPath });
        
    } catch (error) {
        로거_인사?.error('사진 폴더 처리 오류', error);
        에러처리_인사?.handle(error, '사진 폴더를 처리하는 중 오류가 발생했습니다.');
    }
}

/**
 * 이미지 리사이징
 * @private
 * @param {File} file - 이미지 파일
 * @param {number} maxWidth - 최대 가로 크기 (px)
 * @returns {Promise<string>} 리사이징된 이미지의 Blob URL
 */
function _resizeImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = function() {
            // 리사이징 비율 계산
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            
            // 캔버스에 리사이징하여 그리기
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Blob으로 변환
            canvas.toBlob(function(blob) {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    resolve(url);
                } else {
                    // Blob 생성 실패 시 원본 사용
                    resolve(URL.createObjectURL(file));
                }
            }, 'image/jpeg', 0.85);  // JPEG 85% 품질
            
            // 메모리 해제
            URL.revokeObjectURL(img.src);
        };
        
        img.onerror = function() {
            // 로드 실패 시 원본 사용
            resolve(URL.createObjectURL(file));
        };
        
        img.src = URL.createObjectURL(file);
    });
}

/**
 * 직원 목록 필터링
 * @param {string} keyword - 검색어
 */
function filterEmployeeList(keyword) {
    const items = document.querySelectorAll('.employee-checkbox-item');
    const lowerKeyword = keyword.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(lowerKeyword) ? 'flex' : 'none';
    });
}

/**
 * 전체 직원 선택/해제
 * @param {boolean} selectAll - true: 전체선택, false: 전체해제
 */
function toggleAllEmployees(selectAll) {
    const checkboxes = document.querySelectorAll('input[name="profile-card-employees"]');
    checkboxes.forEach(cb => {
        // 표시된 항목만 처리
        if (cb.closest('.employee-checkbox-item').style.display !== 'none') {
            cb.checked = selectAll;
        }
    });
    updateSelectedCount();
}

/**
 * 선택된 직원 수 업데이트
 */
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('input[name="profile-card-employees"]:checked');
    const countEl = document.getElementById('profile-card-selected-count');
    if (countEl) {
        countEl.textContent = checkboxes.length;
    }
}

// 체크박스 변경 시 카운트 업데이트
document.addEventListener('change', function(e) {
    if (e.target.name === 'profile-card-employees') {
        updateSelectedCount();
    }
});

// ===== 데이터 처리 =====

/**
 * 부서 통합 적용
 * @private
 * @param {Array} employees - 직원 목록
 * @param {Array} mergeSettings - 부서 통합 설정
 * @returns {Array} 통합 적용된 직원 목록
 */
function _applyDepartmentMerge(employees, mergeSettings) {
    if (!mergeSettings || mergeSettings.length === 0) {
        return employees;
    }
    
    const mergeMap = new Map(mergeSettings.map(m => [m.source, m.target]));
    
    return employees.map(emp => {
        const currentDept = 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '';
        const mergedDept = mergeMap.get(currentDept);
        
        if (mergedDept) {
            // 부서 통합 적용
            const newEmp = { ...emp };
            if (newEmp.currentPosition) {
                newEmp.currentPosition = {
                    ...newEmp.currentPosition,
                    dept: mergedDept
                };
            }
            newEmp._originalDepartment = currentDept;
            return newEmp;
        }
        return emp;
    });
}

/**
 * 종사자 정렬 (조직도 정렬과 동일)
 * 정렬 순서: 통합 부서 여부 → 직위 순서 → 급여 유형 → 호봉 → 입사일
 * @private
 * @param {Array} employees - 직원 목록
 * @param {Array} positionSettings - 직위 설정
 * @param {string} baseDate - 기준일
 * @returns {Array} 정렬된 직원 목록
 */
function _sortEmployees(employees, positionSettings, baseDate) {
    // 직위별 순서 맵
    const positionOrderMap = new Map();
    if (positionSettings && positionSettings.length > 0) {
        positionSettings.forEach(p => {
            positionOrderMap.set(p.position || p.name, p.order ?? 999);
        });
    }
    
    return [...employees].sort((a, b) => {
        // 0차: 통합된 부서 팀원은 맨 아래
        const isMergedA = a._originalDepartment ? 1 : 0;
        const isMergedB = b._originalDepartment ? 1 : 0;
        if (isMergedA !== isMergedB) return isMergedA - isMergedB;
        
        // 1차: 직위 순서
        const posA = a._displayAsConcurrent?.position || 
                    직원유틸_인사?.getPosition?.(a) || a.currentPosition?.position || '';
        const posB = b._displayAsConcurrent?.position || 
                    직원유틸_인사?.getPosition?.(b) || b.currentPosition?.position || '';
        
        const orderA = positionOrderMap.get(posA) ?? 999;
        const orderB = positionOrderMap.get(posB) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        
        // 2차: 급여 유형 (호봉제 → 연봉제)
        const isRankBasedA = 직원유틸_인사?.isRankBased?.(a) ?? 
                           (a.employment?.employmentType !== '연봉제');
        const isRankBasedB = 직원유틸_인사?.isRankBased?.(b) ?? 
                           (b.employment?.employmentType !== '연봉제');
        if (isRankBasedA !== isRankBasedB) {
            return isRankBasedA ? -1 : 1;
        }
        
        // 3차: 호봉 (높은 순) - ⭐ v5.0.0: 저장된 값 사용 (정렬은 동기 함수)
        if (isRankBasedA && isRankBasedB) {
            const rankA = a.rank?.currentRank || a.rank?.startRank || 0;
            const rankB = b.rank?.currentRank || b.rank?.startRank || 0;
            if (typeof rankA === 'number' && typeof rankB === 'number' && rankA !== rankB) {
                return rankB - rankA;
            }
        }
        
        // 4차: 입사일 (빠른 순)
        const entryA = a.employment?.entryDate || a.entryDate || '';
        const entryB = b.employment?.entryDate || b.entryDate || '';
        if (entryA && entryB) {
            return entryA.localeCompare(entryB);
        }
        
        return 0;
    });
}

/**
 * 육아휴직 상태 확인
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} baseDate - 기준일
 * @returns {Object} { isOnLeave: boolean, period: { start, end } }
 */
function _checkMaternityStatus(emp, baseDate) {
    try {
        // 직원유틸 사용
        if (typeof 직원유틸_인사 !== 'undefined' && 직원유틸_인사.isOnMaternityLeave) {
            const isOnLeave = 직원유틸_인사.isOnMaternityLeave(emp);
            if (isOnLeave && emp.maternityLeave) {
                return {
                    isOnLeave: true,
                    period: {
                        start: emp.maternityLeave.startDate,
                        end: emp.maternityLeave.endDate
                    }
                };
            }
        }
        
        // Fallback: 직접 확인
        if (emp.maternityLeave?.isOnLeave) {
            const start = emp.maternityLeave.startDate;
            const end = emp.maternityLeave.endDate;
            
            // 기준일이 휴직 기간 내인지 확인
            if (start <= baseDate && (!end || end >= baseDate)) {
                return {
                    isOnLeave: true,
                    period: { start, end }
                };
            }
        }
        
        return { isOnLeave: false, period: null };
        
    } catch (error) {
        로거_인사?.warn('육아휴직 상태 확인 오류', error);
        return { isOnLeave: false, period: null };
    }
}

/**
 * 겸직/직무대리 적용
 * @private
 * @param {Array} employees - 직원 목록
 * @param {string} baseDate - 기준일
 * @returns {Array} 겸직 정보가 추가된 직원 목록
 */
function _applyConcurrentPositions(employees, baseDate) {
    try {
        // 겸직관리 함수 확인
        if (typeof getActiveConcurrentPositions !== 'function') {
            return employees;
        }
        
        const concurrentList = getActiveConcurrentPositions(baseDate);
        if (!concurrentList || concurrentList.length === 0) {
            return employees;
        }
        
        // 직원별 겸직 정보 맵 생성
        const concurrentMap = new Map();
        concurrentList.forEach(cp => {
            if (!concurrentMap.has(cp.employeeId)) {
                concurrentMap.set(cp.employeeId, []);
            }
            concurrentMap.get(cp.employeeId).push(cp);
        });
        
        // 직원 데이터에 겸직 정보 추가
        return employees.map(emp => {
            const empConcurrent = concurrentMap.get(emp.id);
            if (empConcurrent && empConcurrent.length > 0) {
                return {
                    ...emp,
                    _concurrentPositions: empConcurrent
                };
            }
            return emp;
        });
        
    } catch (error) {
        로거_인사?.error('겸직 적용 오류', error);
        return employees;
    }
}

/**
 * 직원의 기준일 기준 호봉 계산
 * ⭐ v5.0.0: async로 변경
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} baseDate - 기준일
 * @returns {Promise<number|string>} 호봉 또는 '-'
 */
async function _calculateRankAtDate(emp, baseDate) {
    try {
        // 호봉제 여부 확인 (emp.rank.isRankBased 또는 employment.employmentType)
        const isRankBased = emp.rank?.isRankBased ?? 
                          직원유틸_인사?.isRankBased?.(emp) ?? 
                          (emp.employment?.employmentType !== '연봉제');
        
        if (!isRankBased) {
            return '-';
        }
        
        // ⭐ v5.0.0: 직원유틸의 동적 호봉 계산 함수 사용 (인정율 반영) - await 추가
        if (typeof 직원유틸_인사 !== 'undefined' && typeof 직원유틸_인사.getDynamicRankInfo === 'function') {
            const rankInfo = await 직원유틸_인사.getDynamicRankInfo(emp, baseDate);
            return rankInfo.currentRank;
        }
        
        // Fallback: 기존 방식 (직원유틸 없을 때)
        // emp.rank에 currentRank가 있으면 사용
        if (emp.rank?.currentRank) {
            // 기준일이 오늘이면 currentRank 그대로 사용
            const today = new Date().toISOString().split('T')[0];
            if (baseDate >= today) {
                return emp.rank.currentRank;
            }
            
            // 기준일이 과거면 계산
            const startRank = emp.rank.startRank || 1;
            const firstUpgrade = emp.rank.firstUpgradeDate;
            
            if (!firstUpgrade || baseDate < firstUpgrade) {
                return startRank;
            }
            
            const years = Math.floor((new Date(baseDate) - new Date(firstUpgrade)) / (365.25 * 24 * 60 * 60 * 1000));
            return startRank + 1 + years;
        }
        
        // RankCalculator 사용 (Fallback)
        if (typeof RankCalculator !== 'undefined' && RankCalculator.calculate) {
            const result = RankCalculator.calculate(emp, baseDate);
            return result?.currentRank || '-';
        }
        
        // Fallback - employment 필드 확인
        const fallbackStartRank = emp.rank?.startRank || emp.employment?.startRank || emp.startRank || 1;
        const firstUpgrade = emp.rank?.firstUpgradeDate || emp.employment?.firstUpgradeDate || emp.firstUpgradeDate;
        
        if (!firstUpgrade || baseDate < firstUpgrade) {
            return fallbackStartRank;
        }
        
        const years = Math.floor((new Date(baseDate) - new Date(firstUpgrade)) / (365.25 * 24 * 60 * 60 * 1000));
        return fallbackStartRank + 1 + years;
        
    } catch (error) {
        로거_인사?.warn('호봉 계산 오류', error);
        return '-';
    }
}

/**
 * 직원의 인사이력 조회
 * @private
 * @param {Object} emp - 직원 객체
 * @param {string} baseDate - 기준일
 * @param {boolean} applyContinuousService - 연속근무 이력 통합 여부
 * @returns {Array} 인사이력 배열
 */
function _getAssignmentHistory(emp, baseDate, applyContinuousService = false) {
    try {
        let history = [];
        
        // ⭐ v1.1.0: 연속근무 이력 통합
        if (applyContinuousService && emp.continuousService?.enabled && emp.continuousService?.linkedEmployeeId) {
            const linkedEmp = db.data?.employees?.find(e => e.id === emp.continuousService.linkedEmployeeId);
            if (linkedEmp) {
                const linkedEntry = linkedEmp.employment?.entryDate || linkedEmp.entryDate;
                
                if (linkedEmp.assignments && Array.isArray(linkedEmp.assignments)) {
                    const sortedLinkedAssigns = [...linkedEmp.assignments]
                        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
                    
                    sortedLinkedAssigns.forEach((a, index) => {
                        const isEntry = a.startDate === linkedEntry || index === 0;
                        history.push({
                            date: a.startDate,
                            type: isEntry ? '입사' : '발령',
                            dept: a.dept || a.department || '',
                            position: a.position || '',
                            grade: a.grade || ''
                        });
                    });
                } else if (linkedEntry) {
                    history.push({
                        date: linkedEntry,
                        type: '입사',
                        dept: linkedEmp.currentPosition?.dept || '',
                        position: linkedEmp.currentPosition?.position || ''
                    });
                }
            }
        }
        
        // 입사 정보
        const entryDate = emp.employment?.entryDate || emp.entryDate;
        
        // 발령 이력 (assignments 배열에서 startDate 기준으로 정렬)
        if (emp.assignments && Array.isArray(emp.assignments)) {
            // startDate 기준 오름차순 정렬 (오래된 것부터)
            const sortedAssignments = [...emp.assignments]
                .filter(a => a.startDate && a.startDate <= baseDate)
                .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
            
            sortedAssignments.forEach((a, index) => {
                // 연속근무 시 현재 직원의 첫 발령도 "입사"가 아닌 "발령"으로 (이전 이력이 있으면)
                const isEntry = (a.startDate === entryDate || index === 0) && history.length === 0;
                history.push({
                    date: a.startDate,
                    type: isEntry ? '입사' : '발령',
                    dept: a.dept || a.department || '',
                    position: a.position || '',
                    grade: a.grade || ''
                });
            });
        } else if (entryDate) {
            // assignments가 없으면 입사 정보만
            const isEntry = history.length === 0;
            history.push({
                date: entryDate,
                type: isEntry ? '입사' : '발령',
                dept: emp.currentPosition?.dept || '',
                position: emp.currentPosition?.position || ''
            });
        }
        
        return history;
        
    } catch (error) {
        로거_인사?.warn('인사이력 조회 오류', error);
        return [];
    }
}

/**
 * 직원의 경력사항 조회
 * @private
 * @param {Object} emp - 직원 객체
 * @returns {Array} 경력사항 배열
 */
function _getCareerHistory(emp) {
    try {
        const careers = emp.careerDetails || emp.careers || [];
        
        return careers.map(career => {
            return {
                name: career.name || career.organization || career.workplace || '',  // 기관명
                startDate: career.startDate || '',
                endDate: career.endDate || '',
                period: career.period || '',           // 실 근무기간 (2년 3개월 19일)
                rate: career.rate || '100%',           // 인정률
                workingHours: career.workingHours || 40, // 주당 근무시간
                converted: career.converted || ''      // 환산 기간
            };
        });
        
    } catch (error) {
        로거_인사?.warn('경력사항 조회 오류', error);
        return [];
    }
}

/**
 * 직원의 포상이력 조회 (선정된 것만)
 * @private
 * @param {string} empName - 직원 이름
 * @returns {Object} 외부/내부 포상 배열
 */
function _getAwardHistory(empName) {
    try {
        // awardsManager가 없으면 빈 배열 반환
        if (typeof awardsManager === 'undefined' || !awardsManager?.getAll) {
            return { external: [], internal: [] };
        }
        
        const allAwards = awardsManager.getAll();
        
        // 해당 직원의 선정된 포상만 필터
        const empAwards = allAwards.filter(a => 
            a.name === empName && a.status === '선정'
        );
        
        // 외부/내부 분리
        const external = empAwards
            .filter(a => a.type === '외부')
            .sort((a, b) => (a.awardDate || '').localeCompare(b.awardDate || ''));
        
        const internal = empAwards
            .filter(a => a.type === '내부')
            .sort((a, b) => (a.awardDate || '').localeCompare(b.awardDate || ''));
        
        return { external, internal };
        
    } catch (error) {
        로거_인사?.warn('포상이력 조회 오류', error);
        return { external: [], internal: [] };
    }
}

// ===== 페이지 구성 =====

/**
 * 프로필 카드 페이지 생성
 * @private
 * @param {Object} options - 옵션
 * @returns {Array} 페이지 배열
 */
function _buildProfileCardPages(options) {
    const { baseDate, range, includeConcurrent, includeMaternity, applyContinuousService, selectedEmployees } = options;
    
    try {
        로거_인사?.debug('페이지 구성 시작', options);
        
        // 1. 직원 목록 조회
        let employees = db.getEmployeesAtDate(baseDate);
        
        // 2. 조직도 설정 로드
        const settings = typeof loadOrgChartSettings === 'function' ? loadOrgChartSettings() : null;
        const positionSettings = settings?.positionSettings || [];
        const departmentMerge = settings?.departmentMerge || [];
        
        // 3. 부서 통합 적용
        if (departmentMerge.length > 0) {
            employees = _applyDepartmentMerge(employees, departmentMerge);
            console.log('[인사카드] 부서 통합 적용:', departmentMerge.length, '개 설정');
        }
        
        // 4. 육아휴직자 처리
        employees = employees.map(emp => ({
            ...emp,
            _maternityStatus: _checkMaternityStatus(emp, baseDate)
        }));
        
        if (!includeMaternity) {
            employees = employees.filter(emp => !emp._maternityStatus.isOnLeave);
        }
        
        // 5. 겸직/직무대리 적용
        if (includeConcurrent) {
            employees = _applyConcurrentPositions(employees, baseDate);
        }
        
        // 6. 출력 범위에 따라 페이지 구성
        const pages = [];
        
        if (range === 'individual') {
            // 개별 직원 선택
            const selectedIds = selectedEmployees || [];
            const selectedEmps = employees.filter(emp => selectedIds.includes(emp.id));
            
            selectedEmps.forEach(emp => {
                pages.push(_buildIndividualPage(emp, baseDate, applyContinuousService));
            });
            
        } else if (range === 'executives') {
            // 기관장/부기관장만
            const executives = _getExecutives(employees, positionSettings);
            executives.forEach(emp => {
                pages.push(_buildExecutivePage(emp, baseDate, applyContinuousService));
            });
            
        } else if (range.startsWith('dept:')) {
            // 특정 부서
            const deptName = range.substring(5);
            const executives = _getExecutives(employees, positionSettings);
            const page = _buildDepartmentPage(deptName, employees, baseDate, positionSettings, includeConcurrent, executives, applyContinuousService);
            if (page) pages.push(page);
            
        } else {
            // 전체
            // 기관장/부기관장 페이지
            const executives = _getExecutives(employees, positionSettings);
            executives.forEach(emp => {
                pages.push(_buildExecutivePage(emp, baseDate, applyContinuousService));
            });
            
            // 부서별 페이지 (기관장/부기관장 제외)
            const departments = _getDepartments(employees, executives, positionSettings);
            departments.forEach(dept => {
                const page = _buildDepartmentPage(dept, employees, baseDate, positionSettings, includeConcurrent, executives, applyContinuousService);
                if (page) pages.push(page);
            });
        }
        
        로거_인사?.info('페이지 구성 완료', { pageCount: pages.length });
        return pages;
        
    } catch (error) {
        로거_인사?.error('페이지 구성 오류', error);
        return [];
    }
}

/**
 * 기관장/부기관장 목록 추출
 * @private
 */
function _getExecutives(employees, positionSettings) {
    // 조직도 설정에서 role이 'director' 또는 'viceDirector'인 직위 찾기
    const executivePositions = new Set();
    const positionRoleMap = new Map();
    
    if (positionSettings && positionSettings.length > 0) {
        positionSettings.forEach(p => {
            if (p.role === 'director' || p.role === 'viceDirector') {
                executivePositions.add(p.position || p.name);
            }
            positionRoleMap.set(p.position || p.name, { role: p.role, order: p.order });
        });
    }
    
    // 설정이 없으면 기본값 사용
    if (executivePositions.size === 0) {
        ['관장', '원장', '센터장', '이사장', '사무국장', '부원장', '부센터장'].forEach(p => executivePositions.add(p));
    }
    
    console.log('[인사카드] 기관장/부기관장 직위 목록:', Array.from(executivePositions));
    
    return employees
        .filter(emp => {
            const position = 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
            const isExecutive = executivePositions.has(position);
            
            // role 기반으로도 체크
            const roleInfo = positionRoleMap.get(position);
            const isExecutiveByRole = roleInfo && (roleInfo.role === 'director' || roleInfo.role === 'viceDirector');
            
            return isExecutive || isExecutiveByRole;
        })
        .sort((a, b) => {
            const posA = 직원유틸_인사?.getPosition?.(a) || a.currentPosition?.position || '';
            const posB = 직원유틸_인사?.getPosition?.(b) || b.currentPosition?.position || '';
            
            const roleInfoA = positionRoleMap.get(posA);
            const roleInfoB = positionRoleMap.get(posB);
            
            // director가 viceDirector보다 먼저
            if (roleInfoA?.role === 'director' && roleInfoB?.role !== 'director') return -1;
            if (roleInfoB?.role === 'director' && roleInfoA?.role !== 'director') return 1;
            
            const orderA = roleInfoA?.order ?? 999;
            const orderB = roleInfoB?.order ?? 999;
            
            return orderA - orderB;
        });
}

/**
 * 부서 목록 추출 (기관장/부기관장 제외)
 * @private
 */
function _getDepartments(employees, executives, positionSettings) {
    const executiveIds = new Set(executives.map(e => e.id));
    
    // 기관장/부기관장 role 직위 목록
    const executivePositions = new Set();
    if (positionSettings && positionSettings.length > 0) {
        positionSettings.forEach(p => {
            if (p.role === 'director' || p.role === 'viceDirector') {
                executivePositions.add(p.position || p.name);
            }
        });
    }
    
    const deptSet = new Set();
    
    employees.forEach(emp => {
        // 기관장/부기관장 ID로 제외
        if (executiveIds.has(emp.id)) return;
        
        // 직위가 기관장/부기관장이면 제외
        const position = 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
        if (executivePositions.has(position)) return;
        
        const dept = 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '';
        if (dept) {
            deptSet.add(dept);
        }
    });
    
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'ko'));
}

/**
 * 기관장/부기관장 페이지 생성
 * @private
 */
function _buildExecutivePage(emp, baseDate, applyContinuousService = false) {
    return {
        type: 'executive',
        title: 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '',
        employee: _buildEmployeeData(emp, baseDate, true, applyContinuousService)
    };
}

/**
 * 부서별 페이지 생성
 * @private
 */
function _buildDepartmentPage(deptName, employees, baseDate, positionSettings, includeConcurrent, executives, applyContinuousService = false) {
    // 기관장/부기관장 ID 목록
    const executiveIds = new Set((executives || []).map(e => e.id));
    
    // 기관장/부기관장 role 직위 목록
    const executivePositions = new Set();
    if (positionSettings && positionSettings.length > 0) {
        positionSettings.forEach(p => {
            if (p.role === 'director' || p.role === 'viceDirector') {
                executivePositions.add(p.position || p.name);
            }
        });
    }
    
    // 해당 부서 직원 필터 (기관장/부기관장 제외)
    let deptEmployees = employees.filter(emp => {
        const dept = 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '';
        if (dept !== deptName) return false;
        
        // 기관장/부기관장 제외
        if (executiveIds.has(emp.id)) return false;
        
        const position = 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
        if (executivePositions.has(position)) return false;
        
        return true;
    });
    
    // 겸직/직무대리로 이 부서에 배정된 직원 추가
    if (includeConcurrent) {
        employees.forEach(emp => {
            if (emp._concurrentPositions) {
                const cpForDept = emp._concurrentPositions.find(cp => cp.targetDept === deptName);
                if (cpForDept && !deptEmployees.find(e => e.id === emp.id)) {
                    deptEmployees.push({
                        ...emp,
                        _displayAsConcurrent: cpForDept
                    });
                }
            }
        });
    }
    
    if (deptEmployees.length === 0) {
        return null;
    }
    
    // 종사자 정렬 (조직도와 동일: 통합 부서 → 직위 순서 → 호봉제 → 호봉 → 입사일)
    deptEmployees = _sortEmployees(deptEmployees, positionSettings, baseDate);
    
    // 팀장과 팀원 분리
    const teamLeader = deptEmployees.find(emp => {
        const position = emp._displayAsConcurrent?.position || 
                        직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
        const setting = positionSettings.find(p => (p.position || p.name) === position);
        return setting?.role === 'deptHead' || 
               position.includes('팀장') || position.includes('실장') || position.includes('센터장');
    });
    
    const teamMembers = deptEmployees.filter(emp => emp !== teamLeader);
    
    return {
        type: 'department',
        title: deptName,
        teamLeader: teamLeader ? _buildEmployeeData(teamLeader, baseDate, false, applyContinuousService) : null,
        members: teamMembers.map(emp => _buildEmployeeData(emp, baseDate, false, applyContinuousService))
    };
}

/**
 * 개별 직원 페이지 생성
 * @private
 */
function _buildIndividualPage(emp, baseDate, applyContinuousService = false) {
    return {
        type: 'individual',
        title: '',  // 개별 직원 카드는 제목 없음 (카드 내 이름과 중복 방지)
        employee: _buildEmployeeData(emp, baseDate, true, applyContinuousService)
    };
}

/**
 * 직원 데이터 구성
 * @private
 */
function _buildEmployeeData(emp, baseDate, detailed, applyContinuousService = false) {
    const name = 직원유틸_인사?.getName?.(emp) || emp.personalInfo?.name || '';
    const dept = 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '';
    const position = emp._displayAsConcurrent?.position || 
                    직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || '';
    
    // 겸직/직무대리 정보
    let positionSuffix = '';
    let originalInfo = null;
    
    if (emp._displayAsConcurrent) {
        const type = emp._displayAsConcurrent.type;
        positionSuffix = type === 'concurrent' ? ' (겸직)' : ' (직무대리)';
        originalInfo = {
            dept: 직원유틸_인사?.getDepartment?.(emp) || emp.currentPosition?.dept || '',
            position: 직원유틸_인사?.getPosition?.(emp) || emp.currentPosition?.position || ''
        };
    }
    
    // 육아휴직 상태
    const maternityStatus = emp._maternityStatus || { isOnLeave: false };
    
    // 생년월일과 나이 (만 나이)
    const birthDate = emp.personalInfo?.birthDate || emp.birthDate || '';
    let age = '';
    if (birthDate) {
        const birth = new Date(birthDate);
        const base = new Date(baseDate);
        age = base.getFullYear() - birth.getFullYear();
        
        // 생일이 지나지 않았으면 -1
        if (base.getMonth() < birth.getMonth() || 
            (base.getMonth() === birth.getMonth() && base.getDate() < birth.getDate())) {
            age--;
        }
    }
    
    const data = {
        id: emp.id,
        name,
        dept,
        position,
        positionSuffix,
        originalInfo,
        isOnMaternity: maternityStatus.isOnLeave,
        maternityPeriod: maternityStatus.period,
        birthDate,
        age,
        phone: emp.contactInfo?.phone || emp.personalInfo?.phone || emp.phone || '',
        email: emp.contactInfo?.email || emp.personalInfo?.email || emp.email || '',
        address: emp.contactInfo?.address || emp.personalInfo?.address || emp.address || '',
        // ⭐ v5.0.0: 저장된 호봉 값 사용 (동적 계산은 별도 async 함수로 분리)
        rank: emp.rank?.currentRank || emp.rank?.startRank || '-',
        photo: _photoMap.get(name) || null,
        assignmentHistory: _getAssignmentHistory(emp, baseDate, applyContinuousService)
    };
    
    // 상세 정보 (개별 카드용)
    if (detailed) {
        data.careerHistory = _getCareerHistory(emp);
        data.certificates = [
            emp.personalInfo?.certificate1 || emp.certificate1 || '',
            emp.personalInfo?.certificate2 || emp.certificate2 || ''
        ].filter(c => c);
    }
    
    return data;
}

// ===== 렌더링 =====

/**
 * 미리보기 생성
 */
function previewProfileCards() {
    try {
        로거_인사?.debug('미리보기 생성 시작');
        
        // 옵션 수집
        const options = _collectOptions();
        
        if (options.range === 'individual' && (!options.selectedEmployees || options.selectedEmployees.length === 0)) {
            alert('직원을 1명 이상 선택해주세요.');
            return;
        }
        
        // 페이지 생성
        _generatedPages = _buildProfileCardPages(options);
        
        if (_generatedPages.length === 0) {
            alert('생성할 인사카드가 없습니다.');
            return;
        }
        
        // 렌더링
        const cardType = document.querySelector('input[name="card-type"]:checked')?.value || 'photo';
        const previewContent = document.getElementById('profile-card-preview-content');
        const previewArea = document.getElementById('profile-card-preview');
        const pageInfo = document.getElementById('profile-card-page-info');
        
        let html = '';
        _generatedPages.forEach((page, index) => {
            html += _renderPage(page, cardType, index + 1);
        });
        
        if (previewContent) previewContent.innerHTML = html;
        if (previewArea) previewArea.style.display = 'block';
        if (pageInfo) pageInfo.textContent = `총 ${_generatedPages.length}페이지`;
        
        // 미리보기 영역으로 스크롤
        previewArea?.scrollIntoView({ behavior: 'smooth' });
        
        로거_인사?.info('미리보기 생성 완료', { pageCount: _generatedPages.length });
        
    } catch (error) {
        로거_인사?.error('미리보기 생성 오류', error);
        에러처리_인사?.handle(error, '미리보기를 생성하는 중 오류가 발생했습니다.');
    }
}

/**
 * 인쇄
 */
function printProfileCards() {
    try {
        로거_인사?.debug('인쇄 시작');
        
        // 페이지가 없으면 먼저 생성
        if (_generatedPages.length === 0) {
            previewProfileCards();
        }
        
        if (_generatedPages.length === 0) {
            alert('인쇄할 내용이 없습니다.');
            return;
        }
        
        // 인쇄 영역에 복사
        const cardType = document.querySelector('input[name="card-type"]:checked')?.value || 'photo';
        const printArea = document.getElementById('profile-card-print-area');
        
        if (!printArea) {
            console.error('[인사카드] 인쇄 영역을 찾을 수 없음');
            alert('인쇄 영역을 찾을 수 없습니다.');
            return;
        }
        
        let html = '';
        _generatedPages.forEach((page, index) => {
            html += _renderPage(page, cardType, index + 1, true);
        });
        
        printArea.innerHTML = html;
        
        // 인쇄유틸 사용
        if (typeof 인쇄유틸_인사 !== 'undefined' && 인쇄유틸_인사.print) {
            console.log('[인사카드] 인쇄유틸 사용');
            인쇄유틸_인사.print('profile-card-print-area', 'portrait');
        } else {
            // Fallback: 직접 인쇄 (인쇄유틸 없을 때)
            console.log('[인사카드] Fallback 인쇄');
            printArea.style.display = 'block';
            document.body.classList.add('print-mode');
            printArea.classList.add('print-active');
            
            setTimeout(() => {
                window.print();
                
                setTimeout(() => {
                    document.body.classList.remove('print-mode');
                    printArea.classList.remove('print-active');
                    printArea.style.display = 'none';
                }, 500);
            }, 100);
        }
        
        로거_인사?.info('인쇄 완료');
        
    } catch (error) {
        console.error('[인사카드] 인쇄 오류:', error);
        로거_인사?.error('인쇄 오류', error);
        에러처리_인사?.handle(error, '인쇄 중 오류가 발생했습니다.');
    }
}

/**
 * 옵션 수집
 * @private
 */
function _collectOptions() {
    const baseDate = document.getElementById('profile-card-date')?.value || 
                    new Date().toISOString().split('T')[0];
    const range = document.getElementById('profile-card-range')?.value || 'all';
    const includeConcurrent = document.getElementById('profile-card-concurrent')?.checked ?? true;
    const includeMaternity = document.getElementById('profile-card-maternity')?.checked ?? false;
    const applyContinuousService = document.getElementById('profile-card-continuous-service')?.checked ?? false;
    const twoColumnLayout = document.getElementById('profile-card-two-column')?.checked ?? false;
    
    let selectedEmployees = [];
    if (range === 'individual') {
        const checkboxes = document.querySelectorAll('input[name="profile-card-employees"]:checked');
        selectedEmployees = Array.from(checkboxes).map(cb => cb.value);
    }
    
    return {
        baseDate,
        range,
        includeConcurrent,
        includeMaternity,
        applyContinuousService,
        twoColumnLayout,
        selectedEmployees
    };
}

/**
 * 페이지 렌더링
 * @private
 */
function _renderPage(page, cardType, pageNum, forPrint = false) {
    const pageClass = forPrint ? 'profile-card-page print-page' : 'profile-card-page';
    
    let content = '';
    
    if (page.type === 'executive' || page.type === 'individual') {
        // 단독 페이지
        content = cardType === 'photo' 
            ? _renderPhotoCardSingle(page.employee, page.type === 'individual')
            : _renderTextCardSingle(page.employee, page.type === 'individual');
            
    } else if (page.type === 'department') {
        // 부서별 페이지
        content = cardType === 'photo'
            ? _renderPhotoCardDepartment(page)
            : _renderTextCardDepartment(page);
    }
    
    return `
        <div class="${pageClass}" data-page="${pageNum}">
            ${page.title ? `<div class="page-title">${_escapeHtml(page.title)}</div>` : ''}
            <div class="page-content">
                ${content}
            </div>
        </div>
    `;
}

/**
 * 사진 포함형 - 단독 카드
 * @private
 */
function _renderPhotoCardSingle(emp, isIndividual) {
    const photoHtml = emp.photo 
        ? `<img src="${emp.photo}" alt="${_escapeHtml(emp.name)}" class="card-photo">`
        : `<div class="card-photo-placeholder">📷</div>`;
    
    let positionText = emp.position + (emp.positionSuffix || '');
    if (emp.isOnMaternity) {
        positionText += ' <span class="maternity-badge">🤱 육아휴직 중</span>';
    }
    
    let html = `
        <div class="profile-card-single photo-type">
            <div class="card-photo-area">
                ${photoHtml}
            </div>
            <div class="card-info-area">
                <div class="card-name">${_escapeHtml(emp.name)}</div>
                <div class="card-position">${positionText}</div>
                ${emp.originalInfo ? `<div class="card-original">본직: ${_escapeHtml(emp.originalInfo.dept)} ${_escapeHtml(emp.originalInfo.position)}</div>` : ''}
                <div class="card-divider"></div>
                <div class="card-details">
                    <div class="detail-row">
                        <span class="detail-label">생년월일</span>
                        <span class="detail-value">${emp.birthDate || '-'}${emp.age ? ` (${emp.age}세)` : ''}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">연락처</span>
                        <span class="detail-value">${_escapeHtml(emp.phone) || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">이메일</span>
                        <span class="detail-value">${_escapeHtml(emp.email) || '-'}</span>
                    </div>
                    ${isIndividual ? `
                    <div class="detail-row">
                        <span class="detail-label">주소</span>
                        <span class="detail-value">${_escapeHtml(emp.address) || '-'}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">호봉</span>
                        <span class="detail-value">${emp.rank !== '-' ? emp.rank + '호봉' : '-'}</span>
                    </div>
                </div>
                <div class="card-divider"></div>
                <div class="card-section-title">인사이력</div>
                <div class="card-history">
                    ${_renderAssignmentHistory(emp.assignmentHistory)}
                </div>
    `;
    
    // 개별 카드인 경우 포상/경력/자격증 추가
    if (isIndividual) {
        // 포상이력 (선정된 것만)
        const awards = _getAwardHistory(emp.name);
        const awardHtml = _renderAwardHistory(awards);
        if (awardHtml) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">포상이력</div>
                <div class="card-awards">
                    ${awardHtml}
                </div>
            `;
        }
        
        if (emp.careerHistory && emp.careerHistory.length > 0) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">경력사항</div>
                <div class="card-career">
                    ${_renderCareerHistory(emp.careerHistory)}
                </div>
            `;
        }
        
        if (emp.certificates && emp.certificates.length > 0) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">자격증</div>
                <div class="card-certificates">
                    ${emp.certificates.map(c => `<span class="cert-item">${_escapeHtml(c)}</span>`).join('')}
                </div>
            `;
        }
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * 텍스트형 - 단독 카드
 * @private
 */
function _renderTextCardSingle(emp, isIndividual) {
    let positionText = `${emp.dept} / ${emp.position}${emp.positionSuffix || ''}`;
    if (emp.isOnMaternity) {
        positionText += ' 🤱 육아휴직 중';
    }
    
    let html = `
        <div class="profile-card-single text-type">
            <div class="card-header-bar"></div>
            <div class="card-name-large">${_escapeHtml(emp.name)}</div>
            <div class="card-position-large">${positionText}</div>
            ${emp.originalInfo ? `<div class="card-original">본직: ${_escapeHtml(emp.originalInfo.dept)} ${_escapeHtml(emp.originalInfo.position)}</div>` : ''}
            <div class="card-header-bar"></div>
            
            <div class="card-details text-layout">
                <div class="detail-row">
                    <span class="detail-label">생년월일</span>
                    <span class="detail-value">${emp.birthDate || '-'}${emp.age ? ` (${emp.age}세)` : ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">연락처</span>
                    <span class="detail-value">${_escapeHtml(emp.phone) || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">이메일</span>
                    <span class="detail-value">${_escapeHtml(emp.email) || '-'}</span>
                </div>
                ${isIndividual ? `
                <div class="detail-row">
                    <span class="detail-label">주소</span>
                    <span class="detail-value">${_escapeHtml(emp.address) || '-'}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">호봉</span>
                    <span class="detail-value">${emp.rank !== '-' ? emp.rank + '호봉' : '-'}</span>
                </div>
            </div>
            
            <div class="card-divider"></div>
            <div class="card-section-title">인사이력</div>
            <div class="card-history">
                ${_renderAssignmentHistory(emp.assignmentHistory)}
            </div>
    `;
    
    // 개별 카드인 경우 포상/경력/자격증 추가
    if (isIndividual) {
        // 포상이력 (선정된 것만)
        const awards = _getAwardHistory(emp.name);
        const awardHtml = _renderAwardHistory(awards);
        if (awardHtml) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">포상이력</div>
                <div class="card-awards">
                    ${awardHtml}
                </div>
            `;
        }
        
        if (emp.careerHistory && emp.careerHistory.length > 0) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">경력사항</div>
                <div class="card-career">
                    ${_renderCareerHistory(emp.careerHistory)}
                </div>
            `;
        }
        
        if (emp.certificates && emp.certificates.length > 0) {
            html += `
                <div class="card-divider"></div>
                <div class="card-section-title">자격증</div>
                <div class="card-certificates">
                    ${emp.certificates.map(c => `<span class="cert-item">${_escapeHtml(c)}</span>`).join('')}
                </div>
            `;
        }
    }
    
    html += '</div>';
    
    return html;
}

/**
 * 사진 포함형 - 부서 페이지
 * @private
 */
function _renderPhotoCardDepartment(page) {
    let html = '';
    
    // 팀장
    if (page.teamLeader) {
        html += `
            <div class="dept-leader-section">
                ${_renderPhotoCardMini(page.teamLeader, true)}
            </div>
        `;
    }
    
    // 팀원
    if (page.members && page.members.length > 0) {
        html += '<div class="dept-members-section">';
        page.members.forEach(member => {
            html += _renderPhotoCardMini(member, false);
        });
        html += '</div>';
    }
    
    return html;
}

/**
 * 텍스트형 - 부서 페이지
 * @private
 */
function _renderTextCardDepartment(page) {
    let html = '';
    
    // 팀장
    if (page.teamLeader) {
        html += `
            <div class="dept-leader-section text-type">
                ${_renderTextCardMini(page.teamLeader, true)}
            </div>
        `;
    }
    
    // 팀원
    if (page.members && page.members.length > 0) {
        html += '<div class="dept-members-section text-type">';
        page.members.forEach(member => {
            html += _renderTextCardMini(member, false);
        });
        html += '</div>';
    }
    
    return html;
}

/**
 * 사진 포함형 - 미니 카드 (부서용)
 * @private
 */
function _renderPhotoCardMini(emp, isLeader) {
    const cardClass = isLeader ? 'profile-card-mini leader' : 'profile-card-mini member';
    
    const photoHtml = emp.photo 
        ? `<img src="${emp.photo}" alt="${_escapeHtml(emp.name)}" class="mini-photo">`
        : `<div class="mini-photo-placeholder">📷</div>`;
    
    let positionText = emp.position + (emp.positionSuffix || '');
    if (emp.isOnMaternity) {
        positionText += ' <span class="maternity-badge-small">🤱</span>';
    }
    
    return `
        <div class="${cardClass}">
            <div class="mini-photo-area">
                ${photoHtml}
            </div>
            <div class="mini-info-area">
                <div class="mini-name">${_escapeHtml(emp.name)}</div>
                <div class="mini-position">${positionText}</div>
                ${emp.originalInfo ? `<div class="mini-original">본직: ${_escapeHtml(emp.originalInfo.dept)} ${_escapeHtml(emp.originalInfo.position)}</div>` : ''}
                <div class="mini-details">
                    <span>📅 ${emp.birthDate || '-'}${emp.age ? ` (${emp.age}세)` : ''}</span>
                    <span>📞 ${_escapeHtml(emp.phone) || '-'}</span>
                    <span>📧 ${_escapeHtml(emp.email) || '-'}</span>
                </div>
                <div class="mini-history">${_renderAssignmentHistoryCompact(emp.assignmentHistory)}</div>
                <div class="mini-rank">호봉: ${emp.rank !== '-' ? emp.rank + '호봉' : '-'}</div>
            </div>
        </div>
    `;
}

/**
 * 텍스트형 - 미니 카드 (부서용)
 * @private
 */
function _renderTextCardMini(emp, isLeader) {
    const cardClass = isLeader ? 'profile-card-mini-text leader' : 'profile-card-mini-text member';
    
    let positionText = emp.position + (emp.positionSuffix || '');
    if (emp.isOnMaternity) {
        positionText += ' 🤱';
    }
    
    return `
        <div class="${cardClass}">
            <div class="mini-text-header">
                <span class="mini-text-name">${_escapeHtml(emp.name)}</span>
                <span class="mini-text-position">${positionText}</span>
            </div>
            ${emp.originalInfo ? `<div class="mini-text-original">본직: ${_escapeHtml(emp.originalInfo.dept)} ${_escapeHtml(emp.originalInfo.position)}</div>` : ''}
            <div class="mini-text-details">
                <span>📅 ${emp.birthDate || '-'}${emp.age ? ` (${emp.age}세)` : ''}</span>
                <span>📞 ${_escapeHtml(emp.phone) || '-'}</span>
                <span>📧 ${_escapeHtml(emp.email) || '-'}</span>
            </div>
            <div class="mini-text-history">${_renderAssignmentHistoryCompact(emp.assignmentHistory)}</div>
            <div class="mini-text-rank">호봉: ${emp.rank !== '-' ? emp.rank + '호봉' : '-'}</div>
        </div>
    `;
}

/**
 * 인사이력 렌더링
 * @private
 */
function _renderAssignmentHistory(history) {
    if (!history || history.length === 0) {
        return '<div class="no-data">인사이력 없음</div>';
    }
    
    const twoColumn = document.getElementById('profile-card-two-column')?.checked ?? false;
    
    if (twoColumn) {
        // 2단 서식 (가로 우선 시간순)
        let html = '<div class="history-grid-two-column">';
        history.forEach(h => {
            html += `
                <div class="history-item-compact">
                    <span class="history-date">${h.date}</span>
                    <span class="history-type">${h.type}</span>
                    <span class="history-dept">(${_escapeHtml(h.dept)}, ${_escapeHtml(h.position)})</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }
    
    // 기본 서식 (1열)
    return history.map(h => `
        <div class="history-item">
            <span class="history-date">${h.date}</span>
            <span class="history-content">${h.type} (${_escapeHtml(h.dept)}, ${_escapeHtml(h.position)})</span>
        </div>
    `).join('');
}

/**
 * 인사이력 간략 렌더링 (부서용)
 * @private
 */
function _renderAssignmentHistoryCompact(history) {
    if (!history || history.length === 0) {
        return '';
    }
    
    // 최대 2개만 표시
    const displayHistory = history.slice(0, 2);
    return displayHistory.map(h => 
        `${h.date} ${h.type} (${_escapeHtml(h.dept)}, ${_escapeHtml(h.position)})`
    ).join(', ');
}

/**
 * 경력사항 렌더링
 * @private
 */
function _renderCareerHistory(careers) {
    if (!careers || careers.length === 0) {
        return '<div class="no-data">경력사항 없음</div>';
    }
    
    const twoColumn = document.getElementById('profile-card-two-column')?.checked ?? false;
    
    if (twoColumn) {
        // 2단 서식 (가로 우선 시간순)
        let html = '<div class="career-grid-two-column">';
        careers.forEach(c => {
            html += `
                <div class="career-item-compact">
                    <div class="career-org-compact">${_escapeHtml(c.name)}</div>
                    <div class="career-period-compact">${c.startDate} ~ ${c.endDate || '현재'} (${c.period})</div>
                    <div class="career-rate-compact">인정률: ${c.rate} → ${c.converted}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }
    
    // 기본 서식 (1열)
    return careers.map(c => `
        <div class="career-item">
            <div class="career-org">${_escapeHtml(c.name)}</div>
            <div class="career-detail">
                <span class="career-dates">${c.startDate} ~ ${c.endDate || '현재'}</span>
                <span class="career-period">(${c.period})</span>
            </div>
            <div class="career-convert">
                <span class="career-rate">인정률: ${c.rate}</span>
                <span class="career-converted">→ 환산: ${c.converted}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 포상이력 렌더링
 * @private
 * @param {Object} awards - { external: [], internal: [] }
 * @returns {string} HTML
 */
function _renderAwardHistory(awards) {
    if (!awards || (awards.external.length === 0 && awards.internal.length === 0)) {
        return '';  // 포상이 없으면 빈 문자열 (섹션 자체를 안 보여줌)
    }
    
    const twoColumn = document.getElementById('profile-card-two-column')?.checked ?? false;
    
    let html = '';
    
    if (twoColumn) {
        // 2단 서식 (가로 우선 시간순)
        // 외부 포상
        if (awards.external.length > 0) {
            html += `<div class="award-category">
                <div class="award-category-title">외부</div>
                <div class="award-grid-two-column">
                    ${awards.external.map(a => `
                        <div class="award-item-compact">
                            <span class="award-date">${_formatAwardDate(a.awardDate)}</span>
                            <span class="award-honor">${_escapeHtml(a.honor || '')}</span>
                            <span class="award-org">(${_escapeHtml(a.organization || a.host || '')})</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
        
        // 내부 포상
        if (awards.internal.length > 0) {
            html += `<div class="award-category">
                <div class="award-category-title">내부</div>
                <div class="award-grid-two-column">
                    ${awards.internal.map(a => `
                        <div class="award-item-compact">
                            <span class="award-date">${_formatAwardDate(a.awardDate)}</span>
                            <span class="award-honor">${_escapeHtml(a.honor || '')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    } else {
        // 기본 서식 (1열)
        // 외부 포상
        if (awards.external.length > 0) {
            html += `<div class="award-category">
                <div class="award-category-title">외부</div>
                <div class="award-list">
                    ${awards.external.map(a => `
                        <div class="award-item">
                            <span class="award-date">${_formatAwardDate(a.awardDate)}</span>
                            <span class="award-honor">${_escapeHtml(a.honor || '')}</span>
                            <span class="award-org">(${_escapeHtml(a.organization || a.host || '')})</span>
                            ${a.content ? `<span class="award-detail">- ${_escapeHtml(a.content)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
        
        // 내부 포상
        if (awards.internal.length > 0) {
            html += `<div class="award-category">
                <div class="award-category-title">내부</div>
                <div class="award-list">
                    ${awards.internal.map(a => `
                        <div class="award-item">
                            <span class="award-date">${_formatAwardDate(a.awardDate)}</span>
                            <span class="award-honor">${_escapeHtml(a.honor || '')}</span>
                            ${a.content ? `<span class="award-detail">- ${_escapeHtml(a.content)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    }
    
    return html;
}

/**
 * 포상 날짜 포맷팅
 * @private
 */
function _formatAwardDate(dateStr) {
    if (!dateStr) return '';
    
    // YYYY-MM-DD 또는 YYYY.MM.DD 형식을 YYYY-MM-DD로 통일
    const cleaned = String(dateStr).replace(/\./g, '-').replace(/\s/g, '');
    const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    
    if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
    
    return dateStr;
}

/**
 * HTML 이스케이프
 * @private
 */
function _escapeHtml(str) {
    if (!str) return '';
    if (typeof DOM유틸_인사 !== 'undefined' && DOM유틸_인사.escapeHtml) {
        return DOM유틸_인사.escapeHtml(str);
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== 초기화 로깅 =====
console.log('✅ 인사카드_인사.js 로드 완료');
