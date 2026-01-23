/**
 * license_인사.js - 라이선스 관리 모듈
 * 
 * 라이선스 키 검증, 저장, 만료 확인
 * - 서버 API와 통신하여 라이선스 검증
 * - 로컬 저장소에 라이선스 정보 캐시
 * - 만료 알림 및 차단
 * 
 * @version 1.0.0
 * @since 2026-01-23
 */

const License = (function() {
    'use strict';

    // ===== 설정 =====
    const CONFIG = {
        API_URL: 'https://pulanyznvpsrlkpqotat.supabase.co/functions/v1',
        API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bGFueXpudnBzcmxrcHFvdGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MTY5OTIsImV4cCI6MjA1MzA5Mjk5Mn0.tAnnyMRL5f5bcNBxAuLcH_9D9SgKeEiJwcbfQCMB99o',
        STORAGE_KEY: 'hr_license_info',
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
     */
    function saveCachedLicense(licenseInfo) {
        try {
            licenseInfo.cached_at = new Date().toISOString();
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(licenseInfo));
            cachedLicense = licenseInfo;
        } catch (e) {
            console.error('[License] 캐시 저장 오류:', e);
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
                    'apikey': CONFIG.API_KEY
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
            
            // 유효한 경우 캐시에 저장
            if (result.valid) {
                saveCachedLicense({
                    license_key: licenseKey,
                    valid: result.valid,
                    status: result.status,
                    plan_type: result.plan_type,
                    expire_date: result.expire_date,
                    days_remaining: result.days_remaining
                });
            }

            return result;

        } catch (error) {
            console.error('[License] 서버 검증 오류:', error);
            
            // 오프라인 시 캐시 사용
            const cached = loadCachedLicense();
            if (cached && cached.license_key === licenseKey && isCacheValid(cached)) {
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
     */
    function clear() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        cachedLicense = null;
        console.log('[License] 라이선스 정보 삭제됨');
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
        isExpiringSoon,
        getDaysRemaining,
        getExpireDate,
        getPlanType,
        getDeviceId
    };

})();

// 전역 노출
window.License = License;

console.log('[License] license_인사.js 로드됨 (v1.0.0)');
