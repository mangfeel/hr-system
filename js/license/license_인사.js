/**
 * license_인사.js - 라이선스 관리 모듈
 * 
 * 라이선스 키 검증, 저장, 만료 확인
 * - 서버 API와 통신하여 라이선스 검증
 * - 로컬 저장소에 라이선스 정보 캐시
 * - 만료 알림 및 차단
 * - 사용자별 라이선스 구분 (v1.1.0)
 * - electron-store 동기화 (v1.4.0) - 시간외 앱 연동
 * - 무효 상태도 동기화 (v1.5.0) - 정지/만료 시 시간외 앱 차단
 * 
 * @version 1.5.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v1.5.0 - 라이선스 무효 상태도 electron-store에 동기화 (2026-02-06)
 *   - validateOnServer()에서 valid 여부와 관계없이 항상 saveCachedLicense() 호출
 *   - 라이선스 정지(suspended)/만료(expired) 시 시간외 앱에서도 즉시 감지 가능
 *   - 기존: valid=true일 때만 저장 → 변경: 항상 저장
 * v1.4.0 - electron-store 동기화 (2026-02-06)
 *   - saveCachedLicense()에서 electron-store에도 라이선스 정보 저장
 *   - clear()에서 electron-store에서도 라이선스 정보 삭제
 *   - syncLicenseToStore() 추가: 기존 localStorage 라이선스 → electron-store 마이그레이션
 *   - 시간외근무관리 앱에서 hrStore.get('hr_license_info')로 라이선스 확인 가능
 * v1.3.0 - 라이선스 활성화 시 사용자 검증 (2026-01-27)
 *   - activate()에서 라이선스 소유자와 현재 사용자 비교
 *   - 다른 기관 라이선스 키 입력 차단
 * v1.2.0 - API 키 및 인증 방식 수정 (2026-01-27)
 *   - API_KEY를 최신 값으로 교체
 *   - 헤더를 'apikey'에서 'Authorization: Bearer'로 변경
 * v1.1.0 - 사용자별 라이선스 구분 (2026-01-27)
 *   - 라이선스 저장 시 user_id 함께 저장
 *   - 로그인한 사용자와 라이선스 소유자 비교
 *   - 다른 사용자의 라이선스로 접근 방지
 */

const License = (function() {
    'use strict';

    // ===== 설정 =====
    const CONFIG = {
        API_URL: 'https://pulanyznvpsrlkpqotat.supabase.co/functions/v1',
        API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bGFueXpudnBzcmxrcHFvdGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODgwNzcsImV4cCI6MjA4NDQ2NDA3N30.H-ml4_ztuNY67iLjnPokPgkQEzwEwe0ttW3Ic7K9Mlk',
        STORAGE_KEY: 'hr_license_info',
        USER_STORAGE_KEY: 'hr_current_user',
        STORE_LICENSE_KEY: 'hr_license_info',  // ★ electron-store 키
        CACHE_HOURS: 24  // 오프라인 캐시 유효 시간
    };

    // ===== 내부 변수 =====
    let cachedLicense = null;

    // ===== 유틸리티 함수 =====

    /**
     * 디바이스 고유 ID 생성
     */
    function getDeviceId() {
        let deviceId = localStorage.getItem('hr_device_id');
        if (!deviceId) {
            deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('hr_device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * Electron 환경 확인
     */
    function isElectron() {
        return typeof window !== 'undefined' && window.isElectron === true;
    }

    /**
     * 현재 로그인한 사용자 ID 조회
     */
    function getCurrentUserId() {
        try {
            const userInfo = localStorage.getItem(CONFIG.USER_STORAGE_KEY);
            if (userInfo) {
                const parsed = JSON.parse(userInfo);
                return parsed.id || parsed.user_id || null;
            }
        } catch (e) {
            console.error('[License] 사용자 정보 로드 오류:', e);
        }
        return null;
    }

    /**
     * 현재 사용자 정보 저장
     */
    function setCurrentUser(userId, email) {
        try {
            localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify({
                id: userId,
                email: email,
                logged_at: new Date().toISOString()
            }));
        } catch (e) {
            console.error('[License] 사용자 정보 저장 오류:', e);
        }
    }

    /**
     * 로컬 저장소에서 라이선스 정보 로드
     */
    function loadCachedLicense() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[License] 캐시 로드 오류:', e);
        }
        return null;
    }

    /**
     * 로컬 저장소에 라이선스 정보 저장
     * ★ v1.4.0: electron-store에도 동기화 (시간외 앱 연동)
     */
    function saveCachedLicense(licenseInfo) {
        try {
            licenseInfo.cached_at = new Date().toISOString();
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(licenseInfo));
            cachedLicense = licenseInfo;
            
            // ★ Electron 환경에서 electron-store에도 동기화 (시간외 앱에서 읽기 위함)
            _syncToElectronStore(licenseInfo);
            
        } catch (e) {
            console.error('[License] 캐시 저장 오류:', e);
        }
    }

    /**
     * ★ v1.4.0: electron-store에 라이선스 정보 동기화
     * @private
     * @param {Object} licenseInfo - 라이선스 정보
     */
    function _syncToElectronStore(licenseInfo) {
        try {
            if (isElectron() && window.electronStore && typeof window.electronStore.set === 'function') {
                window.electronStore.set(CONFIG.STORE_LICENSE_KEY, licenseInfo)
                    .then(() => {
                        console.log('[License] electron-store 동기화 완료');
                    })
                    .catch(err => {
                        console.error('[License] electron-store 동기화 오류:', err);
                    });
            }
        } catch (e) {
            console.error('[License] electron-store 동기화 실패:', e);
        }
    }

    /**
     * ★ v1.4.0: electron-store에서 라이선스 정보 삭제
     * @private
     */
    function _removeFromElectronStore() {
        try {
            if (isElectron() && window.electronStore && typeof window.electronStore.delete === 'function') {
                window.electronStore.delete(CONFIG.STORE_LICENSE_KEY)
                    .then(() => {
                        console.log('[License] electron-store 라이선스 삭제 완료');
                    })
                    .catch(err => {
                        console.error('[License] electron-store 삭제 오류:', err);
                    });
            }
        } catch (e) {
            console.error('[License] electron-store 삭제 실패:', e);
        }
    }

    /**
     * ★ v1.4.0: 기존 localStorage 라이선스를 electron-store로 마이그레이션
     * ★ v1.5.0: valid 여부와 관계없이 동기화 (무효 상태도 전달)
     * 앱 시작 시 1회 호출하여 기존 설치에서도 시간외 앱 연동이 가능하도록 함
     */
    function syncLicenseToStore() {
        try {
            if (!isElectron()) return;
            
            const cached = loadCachedLicense();
            if (cached) {
                _syncToElectronStore(cached);
                console.log('[License] 기존 라이선스 → electron-store 마이그레이션 완료 (valid:', cached.valid, ')');
            }
        } catch (e) {
            console.error('[License] 마이그레이션 오류:', e);
        }
    }

    /**
     * 캐시 유효성 확인
     */
    function isCacheValid(licenseInfo) {
        if (!licenseInfo || !licenseInfo.cached_at) return false;
        
        const cachedTime = new Date(licenseInfo.cached_at).getTime();
        const now = Date.now();
        const hoursPassed = (now - cachedTime) / (1000 * 60 * 60);
        
        return hoursPassed < CONFIG.CACHE_HOURS;
    }

    /**
     * 라이선스 소유자 확인
     * @param {Object} licenseInfo - 라이선스 정보
     * @returns {boolean} 현재 사용자의 라이선스인지 여부
     */
    function isLicenseOwnedByCurrentUser(licenseInfo) {
        if (!licenseInfo || !licenseInfo.user_id) {
            // user_id가 없는 구버전 캐시는 무효화
            return false;
        }
        
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
            // 현재 사용자 정보가 없으면 무효
            return false;
        }
        
        return licenseInfo.user_id === currentUserId;
    }

    // ===== 핵심 함수 =====

    /**
     * 서버에서 라이선스 검증
     * @param {string} licenseKey - 라이선스 키
     * @returns {Promise<Object>} 검증 결과
     */
    async function validateOnServer(licenseKey) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/validate-license`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    license_key: licenseKey,
                    device_id: getDeviceId()
                })
            });

            if (!response.ok) {
                throw new Error('서버 응답 오류: ' + response.status);
            }

            const result = await response.json();
            
            // ★ v1.5.0: 서버 검증 결과를 항상 캐시에 저장 (valid 여부와 무관)
            // 이렇게 해야 라이선스 정지/만료 시 시간외 앱에서도 감지 가능
            saveCachedLicense({
                license_key: licenseKey,
                user_id: result.user_id,
                valid: result.valid,
                status: result.status,
                plan_type: result.plan_type,
                expire_date: result.expire_date,
                days_remaining: result.days_remaining
            });

            return result;

        } catch (error) {
            console.error('[License] 서버 검증 오류:', error);
            
            // 오프라인 시 캐시 사용
            const cached = loadCachedLicense();
            if (cached && cached.license_key === licenseKey && isCacheValid(cached)) {
                // 오프라인에서도 사용자 확인
                if (!isLicenseOwnedByCurrentUser(cached)) {
                    throw new Error('다른 사용자의 라이선스입니다.');
                }
                
                console.log('[License] 오프라인 - 캐시 사용');
                return {
                    valid: cached.valid,
                    status: cached.status,
                    plan_type: cached.plan_type,
                    expire_date: cached.expire_date,
                    days_remaining: cached.days_remaining,
                    message: '오프라인 모드 (캐시된 정보)'
                };
            }

            throw error;
        }
    }

    /**
     * 라이선스 키 입력 및 검증
     * @param {string} licenseKey - 라이선스 키
     * @returns {Promise<Object>} 검증 결과
     */
    async function activate(licenseKey) {
        if (!licenseKey || licenseKey.trim() === '') {
            return {
                valid: false,
                status: 'error',
                message: '라이선스 키를 입력하세요.'
            };
        }

        // 키 형식 정리 (공백 제거, 대문자 변환)
        licenseKey = licenseKey.trim().toUpperCase();

        try {
            const result = await validateOnServer(licenseKey);
            
            // ★ 라이선스 소유자 확인
            if (result.valid && result.user_id) {
                const currentUserId = getCurrentUserId();
                if (currentUserId && result.user_id !== currentUserId) {
                    console.log('[License] 다른 사용자의 라이선스 키 입력 거부');
                    return {
                        valid: false,
                        status: 'wrong_user',
                        message: '이 라이선스는 다른 기관에 할당되어 있습니다.\n본인에게 발급된 라이선스 키를 입력하세요.'
                    };
                }
            }
            
            return result;
        } catch (error) {
            return {
                valid: false,
                status: 'error',
                message: '라이선스 검증에 실패했습니다. 인터넷 연결을 확인하세요.'
            };
        }
    }

    /**
     * 저장된 라이선스 확인 (앱 시작 시)
     * @returns {Promise<Object>} 검증 결과
     */
    async function checkStoredLicense() {
        const cached = loadCachedLicense();
        
        if (!cached || !cached.license_key) {
            return {
                valid: false,
                status: 'not_found',
                message: '등록된 라이선스가 없습니다.'
            };
        }

        // ★ 현재 사용자의 라이선스인지 확인
        if (!isLicenseOwnedByCurrentUser(cached)) {
            console.log('[License] 다른 사용자의 라이선스 감지 - 초기화');
            clear();  // 다른 사용자의 라이선스 삭제
            return {
                valid: false,
                status: 'not_found',
                message: '등록된 라이선스가 없습니다.'
            };
        }

        // 만료일 먼저 확인 (오프라인 대비)
        if (cached.expire_date) {
            const expireDate = new Date(cached.expire_date);
            const today = new Date();
            if (today > expireDate) {
                return {
                    valid: false,
                    status: 'expired',
                    message: '라이선스가 만료되었습니다.',
                    expire_date: cached.expire_date
                };
            }
        }

        // 서버에서 재검증 시도
        try {
            const result = await validateOnServer(cached.license_key);
            return result;
        } catch (error) {
            // 오프라인 시 캐시가 유효하면 허용
            if (isCacheValid(cached) && cached.valid) {
                return {
                    valid: true,
                    status: 'offline',
                    plan_type: cached.plan_type,
                    expire_date: cached.expire_date,
                    days_remaining: cached.days_remaining,
                    message: '오프라인 모드로 실행 중입니다.'
                };
            }
            
            return {
                valid: false,
                status: 'error',
                message: '라이선스 확인에 실패했습니다. 인터넷 연결을 확인하세요.'
            };
        }
    }

    /**
     * 현재 라이선스 정보 조회
     * @returns {Object|null} 라이선스 정보
     */
    function getCurrentLicense() {
        if (cachedLicense) return cachedLicense;
        return loadCachedLicense();
    }

    /**
     * 라이선스 정보 삭제 (로그아웃 시)
     * ★ v1.4.0: electron-store에서도 삭제
     */
    function clear() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        cachedLicense = null;
        
        // ★ electron-store에서도 삭제
        _removeFromElectronStore();
        
        console.log('[License] 라이선스 정보 삭제됨');
    }

    /**
     * 사용자 정보도 함께 삭제 (완전 로그아웃)
     */
    function clearAll() {
        clear();
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
        console.log('[License] 모든 인증 정보 삭제됨');
    }

    /**
     * 만료 임박 여부 확인
     * @param {number} warningDays - 경고 일수 (기본 7일)
     * @returns {boolean} 만료 임박 여부
     */
    function isExpiringSoon(warningDays = 7) {
        const license = getCurrentLicense();
        if (!license || !license.days_remaining) return false;
        return license.days_remaining <= warningDays;
    }

    /**
     * 남은 일수 조회
     * @returns {number|null} 남은 일수
     */
    function getDaysRemaining() {
        const license = getCurrentLicense();
        return license ? license.days_remaining : null;
    }

    /**
     * 만료일 조회
     * @returns {string|null} 만료일 (YYYY-MM-DD)
     */
    function getExpireDate() {
        const license = getCurrentLicense();
        return license ? license.expire_date : null;
    }

    /**
     * 플랜 타입 조회
     * @returns {string|null} 플랜 타입
     */
    function getPlanType() {
        const license = getCurrentLicense();
        return license ? license.plan_type : null;
    }

    // ===== Public API =====
    return {
        activate,
        checkStoredLicense,
        getCurrentLicense,
        clear,
        clearAll,
        isExpiringSoon,
        getDaysRemaining,
        getExpireDate,
        getPlanType,
        getDeviceId,
        setCurrentUser,
        getCurrentUserId,
        syncLicenseToStore  // ★ v1.4.0: 마이그레이션 함수 노출
    };

})();

// 전역 노출
window.License = License;

// ★ v1.4.0: 앱 시작 시 기존 라이선스를 electron-store로 동기화
// (기존 설치에서 electron-store에 라이선스가 없는 경우 대비)
if (typeof window !== 'undefined' && window.isElectron === true) {
    // DOM 로드 후 동기화 실행 (electronStore API 준비 대기)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => License.syncLicenseToStore(), 1000);
        });
    } else {
        setTimeout(() => License.syncLicenseToStore(), 1000);
    }
}

console.log('[License] license_인사.js 로드됨 (v1.5.0)');
