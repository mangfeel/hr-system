/**
 * DOM유틸_인사.js
 * 
 * DOM 조작 최적화 및 XSS 방지 유틸리티
 * - DOM 요소 캐싱 (성능 향상)
 * - HTML 이스케이프 (XSS 방지)
 * - DocumentFragment 사용 (성능 최적화)
 * - 안전한 DOM 조작
 * - 편의 메서드
 * 
 * @version 3.1.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.1.0 (2025-11-06) 🐛 캐싱 버그 수정
 *   - getById: 캐시된 요소가 DOM에서 제거된 경우 감지
 *   - document.contains() 체크 추가
 *   - 제거된 요소는 캐시에서 자동 삭제
 *   - 경력 관리 탭 재방문 시 먹통 문제 해결
 * 
 * v3.0 - 프로덕션급 리팩토링: DOM 유틸리티 생성
 * 
 * [의존성]
 * - 없음 (독립적)
 * 
 * [사용 예시]
 * const el = DOM유틸_인사.getById('employeeList');
 * DOM유틸_인사.setTextContent(el, '안전한 텍스트');
 * const safe = DOM유틸_인사.escapeHtml('<script>alert("XSS")</script>');
 */

/**
 * DOM 조작 유틸리티
 * @namespace DOM유틸_인사
 */
const DOM유틸_인사 = (function() {
    /**
     * DOM 요소 캐시
     * @private
     * @type {Map<string, HTMLElement>}
     */
    const _cache = new Map();
    
    /**
     * 캐시 사용 여부
     * @private
     * @type {boolean}
     */
    const _useCaching = typeof CONFIG !== 'undefined' 
        ? CONFIG.PERFORMANCE.CACHE_DOM_ELEMENTS 
        : true;
    
    // Public API
    return {
        /**
         * ID로 요소 가져오기 (캐싱)
         * 
         * @param {string} id - 요소 ID
         * @returns {HTMLElement|null} DOM 요소 또는 null
         * 
         * @example
         * const list = DOM유틸_인사.getById('employeeList');
         */
        getById(id) {
            if (!id) return null;
            
            // 캐시 확인
            if (_useCaching && _cache.has(id)) {
                const cachedElement = _cache.get(id);
                
                // ⭐ 캐시된 요소가 여전히 DOM에 연결되어 있는지 확인
                if (cachedElement && document.contains(cachedElement)) {
                    return cachedElement;
                }
                
                // DOM에서 제거된 요소는 캐시에서 삭제
                _cache.delete(id);
            }
            
            // DOM에서 검색
            const element = document.getElementById(id);
            
            // 캐시에 저장
            if (element && _useCaching) {
                _cache.set(id, element);
            }
            
            return element;
        },
        
        /**
         * 캐시 초기화
         * 
         * @example
         * DOM유틸_인사.clearCache();
         */
        clearCache() {
            _cache.clear();
        },
        
        /**
         * 특정 ID의 캐시 제거
         * 
         * @param {string} id - 요소 ID
         * 
         * @example
         * DOM유틸_인사.removeCacheItem('employeeList');
         */
        removeCacheItem(id) {
            _cache.delete(id);
        },
        
        /**
         * 텍스트 콘텐츠 설정 (안전)
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} text - 텍스트 내용
         * 
         * @example
         * DOM유틸_인사.setTextContent('employeeName', '홍길동');
         * DOM유틸_인사.setTextContent(element, '홍길동');
         */
        setTextContent(elementOrId, text) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.textContent = text;
            }
        },
        
        /**
         * HTML 이스케이프 (XSS 방지)
         * 
         * @param {string} text - 이스케이프할 텍스트
         * @returns {string} 이스케이프된 텍스트
         * 
         * @example
         * const safe = DOM유틸_인사.escapeHtml('<script>alert("XSS")</script>');
         * // &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
         */
        escapeHtml(text) {
            if (text === null || text === undefined) {
                return '';
            }
            
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            
            return String(text).replace(/[&<>"']/g, m => map[m]);
        },
        
        /**
         * HTML 언이스케이프
         * 
         * @param {string} text - 언이스케이프할 텍스트
         * @returns {string} 원본 텍스트
         * 
         * @example
         * const original = DOM유틸_인사.unescapeHtml('&lt;div&gt;');
         * // <div>
         */
        unescapeHtml(text) {
            if (text === null || text === undefined) {
                return '';
            }
            
            const map = {
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&quot;': '"',
                '&#039;': "'"
            };
            
            return String(text).replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, m => map[m]);
        },
        
        /**
         * 자식 요소 일괄 추가 (DocumentFragment 사용)
         * 
         * @param {HTMLElement|string} containerOrId - 컨테이너 요소 또는 ID
         * @param {string|Array<HTMLElement>} htmlOrElements - HTML 문자열 또는 요소 배열
         * 
         * @example
         * DOM유틸_인사.appendChildren('list', '<div>Item 1</div><div>Item 2</div>');
         * DOM유틸_인사.appendChildren('list', [element1, element2]);
         */
        appendChildren(containerOrId, htmlOrElements) {
            const container = typeof containerOrId === 'string' 
                ? this.getById(containerOrId) 
                : containerOrId;
            
            if (!container) return;
            
            const fragment = document.createDocumentFragment();
            
            if (typeof htmlOrElements === 'string') {
                // HTML 문자열인 경우
                const temp = document.createElement('div');
                temp.innerHTML = htmlOrElements;
                
                while (temp.firstChild) {
                    fragment.appendChild(temp.firstChild);
                }
            } else if (Array.isArray(htmlOrElements)) {
                // 요소 배열인 경우
                htmlOrElements.forEach(el => {
                    if (el instanceof HTMLElement) {
                        fragment.appendChild(el);
                    }
                });
            } else if (htmlOrElements instanceof HTMLElement) {
                // 단일 요소인 경우
                fragment.appendChild(htmlOrElements);
            }
            
            // 기존 내용 제거 후 추가
            container.innerHTML = '';
            container.appendChild(fragment);
        },
        
        /**
         * 요소 표시
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} [displayType='block'] - display 속성값
         * 
         * @example
         * DOM유틸_인사.show('employeeList');
         * DOM유틸_인사.show('modal', 'flex');
         */
        show(elementOrId, displayType = 'block') {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.style.display = displayType;
            }
        },
        
        /**
         * 요소 숨김
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * 
         * @example
         * DOM유틸_인사.hide('employeeList');
         */
        hide(elementOrId) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.style.display = 'none';
            }
        },
        
        /**
         * 요소 토글
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} [displayType='block'] - 표시 시 display 속성값
         * 
         * @example
         * DOM유틸_인사.toggle('employeeList');
         */
        toggle(elementOrId, displayType = 'block') {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                if (el.style.display === 'none' || el.style.display === '') {
                    el.style.display = displayType;
                } else {
                    el.style.display = 'none';
                }
            }
        },
        
        /**
         * 클래스 추가
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} className - 클래스명
         * 
         * @example
         * DOM유틸_인사.addClass('button', 'active');
         */
        addClass(elementOrId, className) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && className) {
                el.classList.add(className);
            }
        },
        
        /**
         * 클래스 제거
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} className - 클래스명
         * 
         * @example
         * DOM유틸_인사.removeClass('button', 'active');
         */
        removeClass(elementOrId, className) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && className) {
                el.classList.remove(className);
            }
        },
        
        /**
         * 클래스 토글
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} className - 클래스명
         * @returns {boolean} 토글 후 클래스 존재 여부
         * 
         * @example
         * const hasClass = DOM유틸_인사.toggleClass('button', 'active');
         */
        toggleClass(elementOrId, className) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && className) {
                return el.classList.toggle(className);
            }
            return false;
        },
        
        /**
         * 클래스 존재 확인
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} className - 클래스명
         * @returns {boolean} 클래스 존재 여부
         * 
         * @example
         * if (DOM유틸_인사.hasClass('button', 'active')) { }
         */
        hasClass(elementOrId, className) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && className) {
                return el.classList.contains(className);
            }
            return false;
        },
        
        /**
         * 값 설정 (input, select, textarea)
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string|number} value - 값
         * 
         * @example
         * DOM유틸_인사.setValue('employeeName', '홍길동');
         */
        setValue(elementOrId, value) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.value = value;
            }
        },
        
        /**
         * 값 가져오기 (input, select, textarea)
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @returns {string} 값
         * 
         * @example
         * const name = DOM유틸_인사.getValue('employeeName');
         */
        getValue(elementOrId) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            return el ? el.value : '';
        },
        
        /**
         * HTML 설정 (innerHTML)
         * ⚠️ 주의: XSS 위험이 있으므로 신뢰할 수 있는 내용만 사용
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} html - HTML 내용
         * 
         * @example
         * DOM유틸_인사.setHtml('container', '<div>Content</div>');
         */
        setHtml(elementOrId, html) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.innerHTML = html;
            }
        },
        
        /**
         * 내용 비우기
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * 
         * @example
         * DOM유틸_인사.empty('employeeList');
         */
        empty(elementOrId) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el) {
                el.innerHTML = '';
            }
        },
        
        /**
         * 요소 제거
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * 
         * @example
         * DOM유틸_인사.remove('tempElement');
         */
        remove(elementOrId) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
                
                // 캐시에서도 제거
                if (typeof elementOrId === 'string') {
                    this.removeCacheItem(elementOrId);
                }
            }
        },
        
        /**
         * 속성 설정
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} attr - 속성명
         * @param {string} value - 속성값
         * 
         * @example
         * DOM유틸_인사.setAttribute('button', 'disabled', 'true');
         */
        setAttribute(elementOrId, attr, value) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && attr) {
                el.setAttribute(attr, value);
            }
        },
        
        /**
         * 속성 가져오기
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} attr - 속성명
         * @returns {string|null} 속성값
         * 
         * @example
         * const disabled = DOM유틸_인사.getAttribute('button', 'disabled');
         */
        getAttribute(elementOrId, attr) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            return el ? el.getAttribute(attr) : null;
        },
        
        /**
         * 속성 제거
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} attr - 속성명
         * 
         * @example
         * DOM유틸_인사.removeAttribute('button', 'disabled');
         */
        removeAttribute(elementOrId, attr) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && attr) {
                el.removeAttribute(attr);
            }
        },
        
        /**
         * 요소 생성
         * 
         * @param {string} tagName - 태그명
         * @param {Object} [options={}] - 옵션 { className, id, text, html, attributes }
         * @returns {HTMLElement} 생성된 요소
         * 
         * @example
         * const div = DOM유틸_인사.createElement('div', {
         *     className: 'employee-item',
         *     id: 'emp-001',
         *     text: '홍길동'
         * });
         */
        createElement(tagName, options = {}) {
            const el = document.createElement(tagName);
            
            if (options.className) {
                el.className = options.className;
            }
            
            if (options.id) {
                el.id = options.id;
            }
            
            if (options.text) {
                el.textContent = options.text;
            }
            
            if (options.html) {
                el.innerHTML = options.html;
            }
            
            if (options.attributes) {
                Object.keys(options.attributes).forEach(attr => {
                    el.setAttribute(attr, options.attributes[attr]);
                });
            }
            
            return el;
        },
        
        /**
         * 쿼리 선택자 (단일)
         * 
         * @param {string} selector - CSS 선택자
         * @param {HTMLElement} [context=document] - 검색 컨텍스트
         * @returns {HTMLElement|null} 요소 또는 null
         * 
         * @example
         * const button = DOM유틸_인사.querySelector('.btn-primary');
         */
        querySelector(selector, context = document) {
            return context.querySelector(selector);
        },
        
        /**
         * 쿼리 선택자 (전체)
         * 
         * @param {string} selector - CSS 선택자
         * @param {HTMLElement} [context=document] - 검색 컨텍스트
         * @returns {Array<HTMLElement>} 요소 배열
         * 
         * @example
         * const buttons = DOM유틸_인사.querySelectorAll('.btn');
         */
        querySelectorAll(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },
        
        /**
         * 이벤트 리스너 추가
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} event - 이벤트명
         * @param {Function} handler - 핸들러 함수
         * 
         * @example
         * DOM유틸_인사.on('button', 'click', () => { console.log('클릭'); });
         */
        on(elementOrId, event, handler) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && event && typeof handler === 'function') {
                el.addEventListener(event, handler);
            }
        },
        
        /**
         * 이벤트 리스너 제거
         * 
         * @param {HTMLElement|string} elementOrId - 요소 또는 ID
         * @param {string} event - 이벤트명
         * @param {Function} handler - 핸들러 함수
         * 
         * @example
         * DOM유틸_인사.off('button', 'click', handleClick);
         */
        off(elementOrId, event, handler) {
            const el = typeof elementOrId === 'string' 
                ? this.getById(elementOrId) 
                : elementOrId;
            
            if (el && event && typeof handler === 'function') {
                el.removeEventListener(event, handler);
            }
        },
        
        /**
         * 캐시 통계
         * 
         * @returns {Object} 캐시 통계
         * 
         * @example
         * const stats = DOM유틸_인사.getCacheStats();
         * // { size: 10, enabled: true }
         */
        getCacheStats() {
            return {
                size: _cache.size,
                enabled: _useCaching,
                keys: Array.from(_cache.keys())
            };
        }
    };
})();

/**
 * 전역 별칭 (편의성)
 * @const {Object} DOMUtils
 */
const DOMUtils = DOM유틸_인사;

// 초기화 로그
if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log('✅ DOM유틸_인사.js 로드 완료');
    console.log('DOM 캐시 설정:', DOM유틸_인사.getCacheStats());
}
