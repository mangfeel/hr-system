/**
 * 네비게이션_인사.js - 프로덕션급 리팩토링
 * 
 * 메뉴 네비게이션 및 페이지 이동 제어
 * - 모듈 전환 (대시보드, 인력관리, 노무관리, 보고서, 시스템)
 * - 사이드바 카테고리 토글
 * - 상단 메뉴와 사이드바 동기화
 * - 모바일 메뉴 지원
 * 
 * @version 3.3
 * @since 2024-11-05
 * 
 * [변경 이력]
 * v3.3 - 근로계약서 모듈 연동 (2025-12-09)
 *   - employment-contract 모듈 카테고리 매핑 추가
 *   - loadEmploymentContractModule 초기화 함수 등록
 * v3.2 - 급여 모듈 연동 (2025-12-02)
 *   - salary-settings, salary-status 모듈 초기화 함수 추가
 *   - MODULE_CATEGORY_MAP에 노무관리(labor) 카테고리 추가
 * v3.1 - 급여 설정 모듈 연동 (2025-12-01)
 *   - salary-settings 모듈 카테고리 매핑 추가
 *   - initSalarySettingsModule 초기화 함수 등록
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (로거, 에러처리, DOM유틸)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - 코드 정리 및 주석 추가
 *   - 함수 분리 (가독성 향상)
 *   - null 체크 강화
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 함수 유지
 * 
 * [의존성]
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * 
 * [모듈 매핑]
 * - dashboard: 대시보드
 * - employee-register: 직원 등록
 * - employee-list: 직원 목록
 * - career-manage: 경력 관리
 * - assignment: 인사 발령
 * - employment-contract: 근로계약서
 * - maternity: 육아 휴직
 * - salary-settings: 급여 설정
 * - salary-status: 급여 현황표
 * - overtime: 시간외근무 관리
 * - register: 연명부
 * - certificate: 호봉획정표
 * - new-employee-list: 입사자 목록
 * - retired-list: 퇴사자 목록
 * - settings: 시스템 설정
 * - backup: 백업/복원
 * - import: 데이터 가져오기
 */

// ===== 모듈-카테고리 매핑 =====

/**
 * 모듈 ID와 상단 카테고리 매핑
 * @constant {Object} MODULE_CATEGORY_MAP
 */
const MODULE_CATEGORY_MAP = {
    'dashboard': 'dashboard',
    'employee-register': 'hr',
    'employee-list': 'hr',
    'career-manage': 'hr',
    'assignment': 'hr',
    'employment-contract': 'hr',    // ⭐ 신규: 근로계약서 (인력관리)
    'maternity': 'hr',
    'reduced-work': 'hr',
    'awards-manage': 'hr',          // ⭐ 신규: 포상 등록 (인력관리)
    'salary-settings': 'labor',     // ⭐ 신규: 급여 설정 (노무관리)
    'salary-status': 'labor',       // ⭐ 신규: 급여 현황표 (노무관리)
    'overtime': 'labor',            // ⭐ 신규: 시간외근무 관리 (노무관리)
    'register': 'reports',
    'certificate': 'reports',
    'new-employee-list': 'reports',
    'retired-list': 'reports',
    'tenure-report': 'reports',
    'org-chart': 'reports',
    'profile-card': 'reports',  // ⭐ 신규: 인사카드
    'awards-report': 'reports',     // ⭐ 신규: 포상 현황 (보고서)
    'settings': 'system',
    'org-chart-settings': 'system',
    'concurrent-position': 'system',
    'backup': 'system',
    'import': 'system',
    'statistics': 'reports'
};

// ===== 모듈 네비게이션 =====

/**
 * 모듈 전환
 * 
 * @param {string} moduleId - 이동할 모듈 ID
 * 
 * @description
 * 지정된 모듈로 화면을 전환하고 초기화 함수를 호출합니다.
 * - 모든 모듈 숨김 처리
 * - 선택한 모듈만 표시
 * - 메뉴 활성화 상태 업데이트
 * - 모바일 메뉴 자동 닫기
 * - 모듈별 초기화 함수 실행
 * - 페이지 상단으로 스크롤
 * 
 * @example
 * navigateToModule('employee-list'); // 직원 목록으로 이동
 * 
 * @throws {인사에러} 모듈 요소를 찾을 수 없는 경우
 */
function navigateToModule(moduleId) {
    try {
        로거_인사?.debug('모듈 전환 시작', { moduleId });
        
        // 1. 모든 모듈 숨기기
        const allModules = document.querySelectorAll('.module-content');
        allModules.forEach(module => {
            module.classList.remove('active');
        });
        
        // 2. 선택한 모듈 표시
        const targetModule = document.getElementById(`module-${moduleId}`);
        if (!targetModule) {
            로거_인사?.warn('모듈을 찾을 수 없습니다', { moduleId });
            에러처리_인사?.warn(`모듈을 찾을 수 없습니다: ${moduleId}`);
            return;
        }
        targetModule.classList.add('active');
        
        // 3. 메뉴 활성화 상태 업데이트
        _updateMenuActiveState();
        
        // 4. 모바일 메뉴 닫기
        _closeMobileMenu();
        
        // 5. 모듈별 초기화 함수 호출
        _initializeModule(moduleId);
        
        // 6. 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        로거_인사?.info('모듈 전환 완료', { moduleId });
        
    } catch (error) {
        로거_인사?.error('모듈 전환 오류', { moduleId, error });
        에러처리_인사?.handle(error, '페이지 전환 중 오류가 발생했습니다.');
    }
}

/**
 * 메뉴 활성화 상태 업데이트 (Private)
 * 
 * @private
 * 
 * @description
 * 클릭한 메뉴 항목에 활성화 클래스를 추가합니다.
 */
function _updateMenuActiveState() {
    try {
        const allMenuItems = document.querySelectorAll('.category-items a');
        allMenuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // event가 존재하고 target이 있으면 활성화
        if (typeof event !== 'undefined' && event?.target) {
            event.target.classList.add('active');
        }
    } catch (error) {
        로거_인사?.warn('메뉴 상태 업데이트 오류', error);
    }
}

/**
 * 모바일 메뉴 닫기 (Private)
 * 
 * @private
 * 
 * @description
 * 모바일 환경에서 메뉴 선택 시 사이드바를 자동으로 닫습니다.
 */
function _closeMobileMenu() {
    try {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
    } catch (error) {
        로거_인사?.warn('모바일 메뉴 닫기 오류', error);
    }
}

/**
 * 모듈별 초기화 함수 호출 (Private)
 * 
 * @private
 * @param {string} moduleId - 모듈 ID
 * 
 * @description
 * 각 모듈로 전환 시 필요한 초기화 함수를 호출합니다.
 * - 함수가 존재하지 않아도 에러 발생하지 않음
 */
function _initializeModule(moduleId) {
    try {
        로거_인사?.debug('모듈 초기화 시작', { moduleId });
        
        const moduleInitializers = {
            'dashboard': () => typeof updateDashboard === 'function' && updateDashboard(),
            'employee-register': () => typeof updateUniqueCodeField === 'function' && updateUniqueCodeField(),
            'employee-list': () => typeof loadEmployeeList === 'function' && loadEmployeeList(),
            'career-manage': () => typeof loadCareerManagementTab === 'function' && loadCareerManagementTab(),
            'assignment': () => typeof loadAssignmentTab === 'function' && loadAssignmentTab(),
            'employment-contract': () => typeof loadEmploymentContractModule === 'function' && loadEmploymentContractModule(),  // ⭐ 신규: 근로계약서
            'maternity': () => typeof loadMaternityTab === 'function' && loadMaternityTab(),
            'reduced-work': () => typeof loadReducedWorkTab === 'function' && loadReducedWorkTab(),
            'settings': () => typeof loadSettings === 'function' && loadSettings(),
            'certificate': () => typeof loadCertificateEmployeeList === 'function' && loadCertificateEmployeeList(),
            'tenure-report': () => typeof loadTenureReportModule === 'function' && loadTenureReportModule(),
            'statistics': () => typeof loadStatisticsTab === 'function' && loadStatisticsTab(),
            'org-chart': () => typeof loadOrgChartModule === 'function' && loadOrgChartModule(),
            'org-chart-settings': () => typeof loadOrgChartSettingsModule === 'function' && loadOrgChartSettingsModule(),
            'concurrent-position': () => typeof loadConcurrentPositionModule === 'function' && loadConcurrentPositionModule(),
            'profile-card': () => typeof loadProfileCardModule === 'function' && loadProfileCardModule(),
            'awards-manage': () => typeof loadAwardsManageModule === 'function' && loadAwardsManageModule(),
            'awards-report': () => typeof loadAwardsReportModule === 'function' && loadAwardsReportModule(),
            'salary-settings': () => typeof initSalarySettingsModule === 'function' && initSalarySettingsModule(),  // ⭐ 신규: 급여 설정
            'salary-status': () => typeof loadSalaryStatusModule === 'function' && loadSalaryStatusModule(),        // ⭐ 신규: 급여 현황표
            'overtime': () => typeof loadOvertimeModule === 'function' && loadOvertimeModule(),                      // ⭐ 신규: 시간외근무 관리
            'import': () => typeof refreshAwardsImportStatus === 'function' && refreshAwardsImportStatus()  // ⭐ 신규: 가져오기 상태 갱신
        };
        
        const initializer = moduleInitializers[moduleId];
        if (initializer) {
            initializer();
            로거_인사?.debug('모듈 초기화 완료', { moduleId });
        }
        
    } catch (error) {
        로거_인사?.error('모듈 초기화 오류', { moduleId, error });
        // 초기화 실패해도 모듈 전환은 계속 진행
    }
}

// ===== 카테고리 토글 =====

/**
 * 사이드바 카테고리 토글
 * 
 * @param {string} category - 카테고리 ID (hr, reports, system)
 * 
 * @description
 * 사이드바의 카테고리 메뉴를 펼치거나 접습니다.
 * - hr: 인력관리
 * - reports: 보고서
 * - system: 시스템
 * 
 * @example
 * toggleCategory('hr'); // 인력관리 메뉴 토글
 */
function toggleCategory(category) {
    try {
        로거_인사?.debug('카테고리 토글', { category });
        
        const items = document.getElementById(`${category}-items`);
        const toggle = document.getElementById(`toggle-${category}`);
        
        if (!items) {
            로거_인사?.warn('카테고리 항목을 찾을 수 없습니다', { category });
            return;
        }
        
        // 토글 처리
        const isCollapsed = items.classList.contains('collapsed');
        
        if (isCollapsed) {
            // 펼치기
            items.classList.remove('collapsed');
            if (toggle) {
                toggle.classList.remove('rotated');
            }
            로거_인사?.debug('카테고리 펼침', { category });
        } else {
            // 접기
            items.classList.add('collapsed');
            if (toggle) {
                toggle.classList.add('rotated');
            }
            로거_인사?.debug('카테고리 접음', { category });
        }
        
    } catch (error) {
        로거_인사?.error('카테고리 토글 오류', { category, error });
        에러처리_인사?.handle(error, '메뉴 토글 중 오류가 발생했습니다.');
    }
}

// ===== 모바일 메뉴 토글 =====

/**
 * 모바일 메뉴 토글
 * 
 * @description
 * 모바일 환경에서 햄버거 버튼 클릭 시 사이드바를 열거나 닫습니다.
 * 
 * @example
 * toggleMobileMenu(); // 모바일 메뉴 열기/닫기
 */
function toggleMobileMenu() {
    try {
        로거_인사?.debug('모바일 메뉴 토글');
        
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            로거_인사?.warn('사이드바를 찾을 수 없습니다');
            return;
        }
        
        sidebar.classList.toggle('mobile-open');
        
        const isOpen = sidebar.classList.contains('mobile-open');
        로거_인사?.debug('모바일 메뉴 상태 변경', { isOpen });
        
    } catch (error) {
        로거_인사?.error('모바일 메뉴 토글 오류', error);
        에러처리_인사?.handle(error, '메뉴 열기/닫기 중 오류가 발생했습니다.');
    }
}

// ===== 상단 메뉴 제어 =====

/**
 * 상단 카테고리 선택
 * 
 * @param {string} category - 카테고리 ID (dashboard, hr, reports, system)
 * 
 * @description
 * 상단 메뉴 클릭 시 해당 카테고리로 이동하거나 사이드바를 펼칩니다.
 * - dashboard: 대시보드로 직접 이동
 * - hr, reports, system: 사이드바 해당 카테고리 펼치기
 * 
 * @example
 * selectTopCategory('hr'); // 인력관리 카테고리 선택
 */
function selectTopCategory(category) {
    try {
        로거_인사?.debug('상단 카테고리 선택', { category });
        
        // 1. 상단 메뉴 활성화 상태 변경
        _updateTopMenuActiveState(category);
        
        // 2. 카테고리별 처리
        switch (category) {
            case 'dashboard':
                // 대시보드는 직접 이동
                navigateToModule('dashboard');
                break;
                
            case 'hr':
                // 인력관리 메뉴 펼치기
                _expandCategory('hr');
                break;
                
            case 'reports':
                // 보고서 메뉴 펼치기
                _expandCategory('reports');
                break;
                
            case 'system':
                // 시스템 메뉴 펼치기
                _expandCategory('system');
                break;
                
            default:
                로거_인사?.warn('알 수 없는 카테고리', { category });
        }
        
        로거_인사?.info('상단 카테고리 선택 완료', { category });
        
    } catch (error) {
        로거_인사?.error('상단 카테고리 선택 오류', { category, error });
        에러처리_인사?.handle(error, '카테고리 선택 중 오류가 발생했습니다.');
    }
}

/**
 * 상단 메뉴 활성화 상태 업데이트 (Private)
 * 
 * @private
 * @param {string} category - 활성화할 카테고리
 * 
 * @description
 * 상단 메뉴의 활성화 상태를 업데이트합니다.
 */
function _updateTopMenuActiveState(category) {
    try {
        const allTopMenuItems = document.querySelectorAll('.top-menu-item');
        allTopMenuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`.top-menu-item[data-category="${category}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
    } catch (error) {
        로거_인사?.warn('상단 메뉴 상태 업데이트 오류', error);
    }
}

/**
 * 카테고리 펼치기 (Private)
 * 
 * @private
 * @param {string} category - 펼칠 카테고리
 * 
 * @description
 * 사이드바의 카테고리가 접혀있으면 펼칩니다.
 * 이미 펼쳐져 있으면 그대로 유지합니다.
 */
function _expandCategory(category) {
    try {
        const items = document.getElementById(`${category}-items`);
        if (items && items.classList.contains('collapsed')) {
            toggleCategory(category);
        }
    } catch (error) {
        로거_인사?.warn('카테고리 펼치기 오류', { category, error });
    }
}

// ===== navigateToModule 함수 확장 (상단 메뉴 동기화) =====

/**
 * 원본 navigateToModule 백업
 * @private
 */
const _originalNavigateToModule = window.navigateToModule;

/**
 * navigateToModule 함수 확장
 * 
 * @description
 * 기존 navigateToModule 함수에 상단 메뉴 동기화 기능을 추가합니다.
 * - 모듈 전환 시 상단 메뉴 활성화 상태 자동 업데이트
 * - 기존 기능은 모두 유지
 */
window.navigateToModule = function(moduleId) {
    try {
        // 1. 기존 함수 실행
        if (_originalNavigateToModule) {
            _originalNavigateToModule.apply(this, arguments);
        }
        
        // 2. 모듈에 따라 상단 메뉴 활성화 동기화
        const category = MODULE_CATEGORY_MAP[moduleId];
        if (category) {
            _updateTopMenuActiveState(category);
            로거_인사?.debug('상단 메뉴 동기화 완료', { moduleId, category });
        }
        
    } catch (error) {
        로거_인사?.error('navigateToModule 확장 오류', { moduleId, error });
        // 에러가 발생해도 기본 동작은 수행됨
    }
};

// ===== 초기화 =====

/**
 * 페이지 로드 시 초기 상태 설정
 * 
 * @description
 * - 모든 카테고리 메뉴를 펼쳐둠 (초기 상태)
 * - 사용자 편의를 위해 모든 메뉴가 보이도록 설정
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        로거_인사?.debug('네비게이션 초기화 시작');
        
        // 100ms 후 초기화 (DOM 안정화 대기)
        setTimeout(function() {
            const categories = ['hr', 'reports', 'system'];
            
            categories.forEach(category => {
                try {
                    const items = document.getElementById(`${category}-items`);
                    const toggle = document.getElementById(`toggle-${category}`);
                    
                    if (items && items.classList.contains('collapsed')) {
                        items.classList.remove('collapsed');
                        if (toggle) {
                            toggle.classList.remove('rotated');
                        }
                        로거_인사?.debug('초기 카테고리 펼침', { category });
                    }
                } catch (error) {
                    로거_인사?.warn('카테고리 초기화 오류', { category, error });
                }
            });
            
            로거_인사?.info('네비게이션 초기화 완료');
            
        }, 100);
        
    } catch (error) {
        로거_인사?.error('네비게이션 초기화 오류', error);
        // 초기화 실패해도 시스템은 계속 동작
    }
});
