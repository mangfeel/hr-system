/**
 * 검색_인사.js - 프로덕션급 리팩토링
 * 
 * 전역 검색 기능 (Ctrl+K 또는 Cmd+K)
 * - 직원 검색 (이름, 부서, 고유번호)
 * - 메뉴 검색
 * - 실시간 검색 결과 표시
 * - 키보드 단축키 지원
 * 
 * @version 3.0
 * @since 2024-11-05
 * 
 * [변경 이력]
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (로거, 에러처리, 직원유틸, DOM유틸)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - XSS 방지 (HTML 이스케이프)
 *   - 코드 정리 및 주석 추가
 *   - 함수 분리 (가독성 향상)
 *   - 메뉴 데이터 상수화
 *   - null 체크 강화
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 함수 유지
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 직원유틸_인사.js (직원유틸_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * 
 * [키보드 단축키]
 * - Ctrl+K / Cmd+K: 검색 모달 열기
 * - ESC: 검색 모달 닫기
 */

// ===== 메뉴 데이터 =====

/**
 * 검색 가능한 메뉴 목록
 * @constant {Array<Object>} SEARCH_MENUS
 */
const SEARCH_MENUS = [
    { name: '신규 직원 등록', module: 'employee-register', icon: '➕' },
    { name: '직원 목록', module: 'employee-list', icon: '📋' },
    { name: '경력 관리', module: 'career-manage', icon: '📝' },
    { name: '인사 발령', module: 'assignment', icon: '📄' },
    { name: '육아 휴직', module: 'maternity', icon: '🤱' },
    { name: '연명부', module: 'register', icon: '📋' },
    { name: '호봉획정표', module: 'certificate', icon: '📄' },
    { name: '입사자 목록', module: 'new-employee-list', icon: '📋' },
    { name: '퇴사자 목록', module: 'retired-list', icon: '📋' },
    { name: '백업', module: 'backup', icon: '💾' },
    { name: '조직 설정', module: 'settings', icon: '⚙️' }
];

// ===== 검색 모달 제어 =====

/**
 * 검색 모달 열기
 * 
 * @description
 * 전역 검색 모달을 열고 입력 필드에 포커스를 설정합니다.
 * - Ctrl+K 또는 Cmd+K 단축키로 호출 가능
 * 
 * @example
 * openSearchModal(); // 검색 모달 열기
 */
function openSearchModal() {
    try {
        로거_인사?.debug('검색 모달 열기');
        
        const modal = document.getElementById('searchModal');
        const input = document.getElementById('searchModalInput');
        
        if (!modal) {
            로거_인사?.warn('검색 모달을 찾을 수 없습니다');
            return;
        }
        
        // 모달 표시
        modal.classList.add('active');
        
        // 입력 필드에 포커스
        if (input) {
            input.focus();
        }
        
        로거_인사?.info('검색 모달 열림');
        
    } catch (error) {
        로거_인사?.error('검색 모달 열기 오류', error);
        에러처리_인사?.handle(error, '검색 창을 여는 중 오류가 발생했습니다.');
    }
}

/**
 * 검색 모달 닫기
 * 
 * @param {Event} [e] - 이벤트 객체 (선택)
 * 
 * @description
 * 검색 모달을 닫고 입력 내용 및 결과를 초기화합니다.
 * - 배경 클릭 시 닫기
 * - ESC 키로 닫기
 * 
 * @example
 * closeSearchModal(); // 검색 모달 닫기
 * closeSearchModal(event); // 이벤트와 함께 닫기
 */
function closeSearchModal(e) {
    try {
        // 배경 클릭이 아니면 무시
        if (e && e.target && e.target.id !== 'searchModal') {
            return;
        }
        
        로거_인사?.debug('검색 모달 닫기');
        
        const modal = document.getElementById('searchModal');
        const input = document.getElementById('searchModalInput');
        const results = document.getElementById('searchResults');
        
        if (!modal) {
            로거_인사?.warn('검색 모달을 찾을 수 없습니다');
            return;
        }
        
        // 모달 숨기기
        modal.classList.remove('active');
        
        // 입력 내용 초기화
        if (input) {
            input.value = '';
        }
        
        // 결과 초기화
        if (results) {
            results.innerHTML = '<div class="no-results">검색어를 입력하세요</div>';
        }
        
        로거_인사?.info('검색 모달 닫힘');
        
    } catch (error) {
        로거_인사?.error('검색 모달 닫기 오류', error);
        // 닫기 오류는 사용자에게 알리지 않음 (UX)
    }
}

// ===== 검색 실행 =====

/**
 * 검색 실행
 * 
 * @param {string} query - 검색어
 * 
 * @description
 * 입력된 검색어로 직원과 메뉴를 검색하고 결과를 표시합니다.
 * - 직원 검색: 이름, 부서, 고유번호
 * - 메뉴 검색: 메뉴명
 * - 최대 10개 직원 결과 표시
 * - XSS 방지 처리
 * - 공백 제거 및 소문자 변환
 * 
 * @example
 * performSearch('홍길동'); // 검색 실행
 */
function performSearch(query) {
    try {
        로거_인사?.debug('검색 실행', { query });
        
        const container = document.getElementById('searchResults');
        if (!container) {
            로거_인사?.warn('검색 결과 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        // 검색어 정규화: trim만 수행 (공백 제거는 각 검색 함수에서)
        const normalizedQuery = query.trim();
        
        // 빈 검색어 처리
        if (!normalizedQuery) {
            container.innerHTML = '<div class="no-results">검색어를 입력하세요</div>';
            return;
        }
        
        // 1. 검색 실행
        const results = {
            employees: _searchEmployees(normalizedQuery),
            menus: _searchMenus(normalizedQuery)
        };
        
        // 2. 결과 HTML 생성
        const resultHTML = _buildResultHTML(results);
        
        // 3. 결과 표시
        container.innerHTML = resultHTML;
        
        로거_인사?.info('검색 완료', {
            query: normalizedQuery,
            employeeCount: results.employees.length,
            menuCount: results.menus.length
        });
        
    } catch (error) {
        로거_인사?.error('검색 실행 오류', { query, error });
        
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = '<div class="no-results">검색 중 오류가 발생했습니다</div>';
        }
    }
}

/**
 * 직원 검색 (Private)
 * 
 * @private
 * @param {string} query - 검색어 (trim만 처리됨)
 * @returns {Array<Object>} 검색된 직원 목록
 * 
 * @description
 * 이름, 부서, 고유번호로 직원을 검색합니다.
 * 최대 50개 결과만 반환합니다.
 * 결과는 이름 가나다순으로 정렬됩니다.
 * 공백을 제거하여 정확한 매칭을 수행합니다.
 * 대소문자 구분 없이 검색합니다 (영문의 경우).
 */
function _searchEmployees(query) {
    try {
        // DB 확인
        if (typeof db === 'undefined' || !db) {
            로거_인사?.error('DB를 찾을 수 없습니다');
            console.error('검색 오류: db 객체가 없습니다');
            return [];
        }
        
        const employees = db.getEmployees();
        
        // 직원 데이터 확인
        if (!employees || employees.length === 0) {
            로거_인사?.warn('직원 데이터가 없습니다');
            console.warn('검색: 직원 데이터 없음');
            return [];
        }
        
        로거_인사?.debug('직원 검색 시작', { 
            query, 
            totalEmployees: employees.length 
        });
        console.log('검색 시작:', { query, 직원수: employees.length });
        
        const results = [];
        
        // 검색어 정규화: 공백 제거 + 소문자 변환
        const searchQuery = query.replace(/\s+/g, '').toLowerCase();
        
        if (!searchQuery) {
            return [];
        }
        
        console.log('정규화된 검색어:', searchQuery);
        
        employees.forEach(emp => {
            try {
                // 직원 정보 추출
                const name = (typeof 직원유틸_인사 !== 'undefined')
                    ? 직원유틸_인사.getName(emp)
                    : (emp.personalInfo?.name || emp.name || '');
                
                const dept = (typeof 직원유틸_인사 !== 'undefined')
                    ? 직원유틸_인사.getDepartment(emp)
                    : (emp.currentPosition?.dept || emp.dept || '');
                
                const code = emp.uniqueCode || '';
                
                // 데이터 정규화: 공백 제거 + 소문자 변환
                const normalizedName = name.replace(/\s+/g, '').toLowerCase();
                const normalizedDept = dept.replace(/\s+/g, '').toLowerCase();
                const normalizedCode = code.replace(/\s+/g, '').toLowerCase();
                
                // 검색 매칭: 부분 문자열 포함 검사
                const isMatch = 
                    normalizedName.includes(searchQuery) || 
                    normalizedDept.includes(searchQuery) || 
                    normalizedCode.includes(searchQuery);
                
                if (isMatch) {
                    console.log('매칭됨:', { name, dept, code });
                    results.push({
                        id: emp.id,
                        name: name,
                        dept: dept,
                        code: code
                    });
                }
            } catch (error) {
                로거_인사?.warn('직원 검색 항목 처리 오류', { emp: emp.id, error });
                console.error('직원 항목 처리 오류:', error);
            }
        });
        
        // ✅ 이름 가나다순 정렬
        results.sort((a, b) => {
            return a.name.localeCompare(b.name, 'ko-KR');
        });
        
        로거_인사?.debug('직원 검색 결과', { 
            query: searchQuery, 
            count: results.length 
        });
        console.log('검색 결과:', results.length, '명 (가나다순 정렬)');
        
        // 최대 50개만 반환
        return results.slice(0, 50);
        
    } catch (error) {
        로거_인사?.error('직원 검색 오류', error);
        console.error('직원 검색 오류:', error);
        return [];
    }
}

/**
 * 메뉴 검색 (Private)
 * 
 * @private
 * @param {string} query - 검색어 (trim만 처리됨)
 * @returns {Array<Object>} 검색된 메뉴 목록
 * 
 * @description
 * 메뉴명으로 메뉴를 검색합니다.
 * 한글도 정확히 매칭되도록 처리합니다.
 * 공백을 제거하여 정확한 매칭을 수행합니다.
 */
function _searchMenus(query) {
    try {
        const results = [];
        
        // 검색어 정규화: 공백 제거 + 소문자 변환
        const searchQuery = query.replace(/\s+/g, '').toLowerCase();
        
        if (!searchQuery) {
            return [];
        }
        
        SEARCH_MENUS.forEach(menu => {
            // 메뉴명 정규화: 공백 제거 + 소문자 변환
            const menuName = menu.name.replace(/\s+/g, '').toLowerCase();
            
            // 검색 매칭: 부분 문자열 포함 검사
            if (menuName.includes(searchQuery)) {
                results.push(menu);
            }
        });
        
        로거_인사?.debug('메뉴 검색 결과', { 
            query: searchQuery, 
            count: results.length 
        });
        
        return results;
        
    } catch (error) {
        로거_인사?.error('메뉴 검색 오류', error);
        return [];
    }
}

/**
 * 검색 결과 HTML 생성 (Private)
 * 
 * @private
 * @param {Object} results - 검색 결과 객체
 * @param {Array<Object>} results.employees - 직원 검색 결과
 * @param {Array<Object>} results.menus - 메뉴 검색 결과
 * @returns {string} HTML 문자열
 * 
 * @description
 * 검색 결과를 HTML로 변환합니다.
 * XSS 방지를 위해 모든 데이터를 이스케이프 처리합니다.
 */
function _buildResultHTML(results) {
    try {
        const { employees, menus } = results;
        
        // 결과 없음
        if (employees.length === 0 && menus.length === 0) {
            return '<div class="no-results">검색 결과가 없습니다</div>';
        }
        
        let html = '';
        
        // 직원 결과
        if (employees.length > 0) {
            html += '<div class="result-group"><div class="group-title">직원</div>';
            
            employees.forEach(emp => {
                // ✅ XSS 방지
                const safeName = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(emp.name)
                    : emp.name.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                const safeDept = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(emp.dept)
                    : emp.dept.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                const safeCode = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(emp.code)
                    : emp.code.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                const safeId = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(emp.id)
                    : emp.id.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                html += `<div class="result-item" onclick="executeSearchResult('employee', '${safeId}')">
                    <div class="result-icon">👤</div>
                    <div class="result-content">
                        <div class="result-name">${safeName}</div>
                        <div class="result-meta">${safeDept} · ${safeCode}</div>
                    </div>
                </div>`;
            });
            
            html += '</div>';
        }
        
        // 메뉴 결과
        if (menus.length > 0) {
            html += '<div class="result-group"><div class="group-title">메뉴</div>';
            
            menus.forEach(menu => {
                // ✅ XSS 방지
                const safeName = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(menu.name)
                    : menu.name.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                const safeModule = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(menu.module)
                    : menu.module.replace(/[&<>"']/g, function(m) {
                        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
                    });
                
                const safeIcon = (typeof DOM유틸_인사 !== 'undefined')
                    ? DOM유틸_인사.escapeHtml(menu.icon)
                    : menu.icon;
                
                html += `<div class="result-item" onclick="executeSearchResult('menu', '${safeModule}')">
                    <div class="result-icon">${safeIcon}</div>
                    <div class="result-content"><div class="result-name">${safeName}</div></div>
                </div>`;
            });
            
            html += '</div>';
        }
        
        return html;
        
    } catch (error) {
        로거_인사?.error('검색 결과 HTML 생성 오류', error);
        return '<div class="no-results">결과 표시 중 오류가 발생했습니다</div>';
    }
}

// ===== 검색 결과 실행 =====

/**
 * 검색 결과 실행
 * 
 * @param {string} type - 결과 타입 ('employee' | 'menu')
 * @param {string} id - 직원 ID 또는 모듈 ID
 * 
 * @description
 * 검색 결과를 클릭했을 때 해당 항목을 실행합니다.
 * - employee: 직원 상세 페이지 표시
 * - menu: 해당 메뉴로 이동
 * 
 * @example
 * executeSearchResult('employee', 'emp123'); // 직원 상세
 * executeSearchResult('menu', 'employee-list'); // 직원 목록으로 이동
 */
function executeSearchResult(type, id) {
    try {
        로거_인사?.debug('검색 결과 실행', { type, id });
        
        // 모달 닫기
        closeSearchModal();
        
        // 타입별 처리
        if (type === 'employee') {
            // 직원 상세 페이지
            if (typeof showEmployeeDetail === 'function') {
                showEmployeeDetail(id);
                로거_인사?.info('직원 상세 페이지 열림', { id });
            } else {
                로거_인사?.warn('showEmployeeDetail 함수를 찾을 수 없습니다');
                에러처리_인사?.warn('직원 상세 페이지를 열 수 없습니다.');
            }
            
        } else if (type === 'menu') {
            // 메뉴로 이동
            if (typeof navigateToModule === 'function') {
                navigateToModule(id);
                로거_인사?.info('메뉴로 이동', { module: id });
            } else {
                로거_인사?.warn('navigateToModule 함수를 찾을 수 없습니다');
                에러처리_인사?.warn('메뉴로 이동할 수 없습니다.');
            }
            
        } else {
            로거_인사?.warn('알 수 없는 검색 결과 타입', { type, id });
        }
        
    } catch (error) {
        로거_인사?.error('검색 결과 실행 오류', { type, id, error });
        에러처리_인사?.handle(error, '검색 결과를 열 수 없습니다.');
    }
}

// ===== 키보드 단축키 등록 =====

/**
 * 키보드 단축키 초기화
 * 
 * @description
 * 페이지 로드 시 키보드 단축키를 등록합니다.
 * - Ctrl+K / Cmd+K: 검색 모달 열기
 * - ESC: 검색 모달 닫기
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        로거_인사?.debug('검색 키보드 단축키 등록');
        
        document.addEventListener('keydown', function(e) {
            try {
                // Ctrl+K 또는 Cmd+K
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    openSearchModal();
                    로거_인사?.debug('검색 단축키 실행 (Ctrl/Cmd+K)');
                }
                
                // ESC로 검색 모달 닫기
                if (e.key === 'Escape') {
                    const modal = document.getElementById('searchModal');
                    if (modal && modal.classList.contains('active')) {
                        closeSearchModal();
                        로거_인사?.debug('검색 모달 닫기 (ESC)');
                    }
                }
            } catch (error) {
                로거_인사?.warn('키보드 이벤트 처리 오류', error);
            }
        });
        
        로거_인사?.info('검색 키보드 단축키 등록 완료');
        
    } catch (error) {
        로거_인사?.error('검색 키보드 단축키 등록 오류', error);
        // 단축키 등록 실패해도 시스템은 계속 동작
    }
});
