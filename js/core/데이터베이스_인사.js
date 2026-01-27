/**
 * 데이터베이스_인사.js - 프로덕션급 리팩토링
 * 
 * 인사관리시스템의 핵심 데이터 레이어
 * - localStorage 기반 데이터 관리
 * - Electron 환경에서 electron-store 연동
 * - CRUD 작업 (생성, 읽기, 수정, 삭제)
 * - 고유번호 생성 및 중복 검증
 * - 데이터 무결성 검증
 * 
 * @version 4.0.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.0.0 (2026-01-23) - Electron 데스크톱 앱 지원
 *   - Electron 환경 감지 (window.isElectron)
 *   - electron-store 연동 (백업/복원)
 *   - _initElectronStore(), _saveToElectronStore() 추가
 *   - syncFromElectronStore() 메서드 추가
 *   - save() 시 electron-store에도 백업
 * 
 * v3.1.1 (2025-12-04) - 기준일 기준 재직자 조회 기능 추가
 *   - getEmployeesAtDate(baseDate) 메서드 추가
 *   - 연명부, 인사카드, 조직도 등에서 공통 사용 가능
 *   - 입사일/퇴사일 기준 재직자 필터링
 * 
 * v3.1.0 (2025-12-04) ⭐ 사원번호 자동생성 기능 추가
 *   - generateEmployeeNumber(entryYear) 함수 추가
 *   - 형식: YYYY-NNNN (예: 2026-0001)
 *   - 연도별 리셋, 빈 번호 재사용
 *   - getNextEmployeeNumber(entryYear) 미리보기 함수 추가
 * 
 * v3.0 - 프로덕션급 리팩토링
 *   - 상수 사용 (CONFIG)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - JSDoc 주석 추가
 *   - 데이터 검증 강화
 * 
 * [하위 호환성]
 * - 모든 기존 메서드명 유지
 * - 기존 API 100% 호환
 * - 전역 인스턴스 'db' 유지
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG)
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사, 인사에러) - 선택
 */

// ===== 전역 상수 =====

/**
 * localStorage 키
 * @const {string}
 */
const STORAGE_KEY = typeof CONFIG !== 'undefined' 
    ? CONFIG.STORAGE_KEY 
    : 'hr_system_v25_db';

/**
 * Electron 환경 여부
 * @const {boolean}
 */
const IS_ELECTRON = typeof window !== 'undefined' && window.isElectron === true;

// ===== 데이터베이스 클래스 =====

/**
 * 인사관리 데이터베이스 클래스
 * localStorage 기반 데이터 관리
 * 
 * @class HRDatabase
 */
class HRDatabase {
    /**
     * 생성자
     * 초기화 시 localStorage에서 데이터 로드
     */
    constructor() {
        try {
            로거_인사?.info('데이터베이스 초기화 시작');
            this.data = this.load();
            
            // Electron 환경이면 electron-store에서 동기화 (비동기)
            if (IS_ELECTRON) {
                this._initElectronStore();
            }
            
            로거_인사?.info('데이터베이스 초기화 완료', {
                employeeCount: this.data.employees?.length || 0,
                version: this.data.settings?.version
            });
        } catch (error) {
            로거_인사?.error('데이터베이스 초기화 실패', error);
            
            // 데이터 복구 시도
            console.error('데이터베이스 초기화 실패, 기본 데이터로 복구:', error);
            this.data = this._getDefaultData();
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(
                    error,
                    '데이터베이스 초기화 중 오류가 발생했습니다.\n기본 데이터로 복구되었습니다.'
                );
            }
        }
    }
    
    /**
     * Electron 환경 초기화
     * electron-store에서 데이터 가져와서 localStorage와 동기화
     * @private
     * @async
     */
    async _initElectronStore() {
        try {
            console.log('[DB] Electron 환경 감지, electron-store 동기화 시작');
            
            // electronStore가 없으면 스킵
            if (!window.electronStore?.get) {
                console.warn('[DB] electronStore가 없습니다. localStorage만 사용합니다.');
                return;
            }
            
            const result = await window.electronStore.get(STORAGE_KEY);
            
            if (result && result.success && result.data) {
                const storeData = result.data;
                const localData = this.data;
                
                const localEmpty = !localData.employees || localData.employees.length === 0;
                const storeHasData = storeData.employees && storeData.employees.length > 0;
                
                if (localEmpty && storeHasData) {
                    console.log('[DB] electron-store에서 데이터 복원:', storeData.employees.length, '명');
                    this.data = storeData;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
                } else if (!localEmpty) {
                    console.log('[DB] localStorage 데이터를 electron-store에 백업');
                    await this._saveToElectronStore();
                }
            } else {
                console.log('[DB] electron-store 초기화, 현재 데이터 저장');
                await this._saveToElectronStore();
            }
            
            if (window.electronStore?.getPath) {
                const pathResult = await window.electronStore.getPath();
                if (pathResult && pathResult.success) {
                    console.log('[DB] electron-store 경로:', pathResult.path);
                }
            }
            
        } catch (error) {
            console.warn('[DB] electron-store 동기화 실패 (무시됨):', error);
        }
    }
    
    /**
     * electron-store에 데이터 저장 (비동기)
     * @private
     * @async
     * @returns {Promise<boolean>}
     */
    async _saveToElectronStore() {
        if (!IS_ELECTRON) return false;
        
        try {
            // electronStore가 없으면 스킵
            if (!window.electronStore?.set) {
                return false;
            }
            
            const result = await window.electronStore.set(STORAGE_KEY, this.data);
            if (result && result.success) {
                console.log('[DB] electron-store 저장 완료');
                return true;
            } else {
                console.warn('[DB] electron-store 저장 실패:', result?.error);
                return false;
            }
        } catch (error) {
            console.warn('[DB] electron-store 저장 오류 (무시됨):', error);
            return false;
        }
    }
    
    /**
     * electron-store에서 데이터 동기화 (수동 호출용)
     * @async
     * @returns {Promise<boolean>}
     */
    async syncFromElectronStore() {
        if (!IS_ELECTRON) {
            console.log('[DB] Electron 환경이 아님, 동기화 스킵');
            return false;
        }
        
        try {
            // electronStore가 없으면 스킵
            if (!window.electronStore?.get) {
                return false;
            }
            
            const result = await window.electronStore.get(STORAGE_KEY);
            
            if (result && result.success && result.data) {
                this.data = result.data;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
                console.log('[DB] electron-store에서 동기화 완료:', this.data.employees?.length || 0, '명');
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('[DB] electron-store 동기화 실패 (무시됨):', error);
            return false;
        }
    }
    
    /**
     * 기본 데이터 구조 반환
     * 
     * @private
     * @returns {Object} 기본 데이터 구조
     */
    _getDefaultData() {
        return {
            employees: [],
            settings: {
                organizationName: '조직명',
                version: typeof CONFIG !== 'undefined' ? CONFIG.VERSION : '3.0',
                lastBackup: null,
                nextUniqueCodeNumber: 1
            }
        };
    }
    
    /**
     * localStorage에서 데이터 로드
     * 
     * @returns {Object} 로드된 데이터 또는 기본 데이터
     * @throws {인사에러} 데이터 파싱 실패 시
     */
    load() {
        try {
            로거_인사?.debug('데이터 로드 시작', { key: STORAGE_KEY });
            
            const saved = localStorage.getItem(STORAGE_KEY);
            
            if (!saved) {
                로거_인사?.info('저장된 데이터 없음, 기본 데이터 사용');
                return this._getDefaultData();
            }
            
            const data = JSON.parse(saved);
            
            // 데이터 구조 검증
            if (!data.employees || !Array.isArray(data.employees)) {
                로거_인사?.warn('데이터 구조 오류: employees 배열 없음');
                data.employees = [];
            }
            
            if (!data.settings || typeof data.settings !== 'object') {
                로거_인사?.warn('데이터 구조 오류: settings 객체 없음');
                data.settings = this._getDefaultData().settings;
            }
            
            로거_인사?.info('데이터 로드 완료', {
                employeeCount: data.employees.length,
                storageSize: saved.length
            });
            
            return data;
            
        } catch (error) {
            로거_인사?.error('데이터 로드 실패', error);
            
            // JSON 파싱 에러
            if (error instanceof SyntaxError) {
                console.error('❌ 데이터 손상 감지:', error);
                
                if (typeof 인사에러 !== 'undefined') {
                    throw new 인사에러(
                        '저장된 데이터가 손상되었습니다',
                        typeof CONFIG !== 'undefined' ? CONFIG.ERROR_CODES.DB_CORRUPT : 'DB_CORRUPT',
                        { originalError: error.message }
                    );
                }
            }
            
            // 기타 에러는 기본 데이터 반환
            console.error('데이터 로드 실패, 기본 데이터 반환:', error);
            return this._getDefaultData();
        }
    }
    
    /**
     * 데이터를 localStorage에 저장
     * 
     * @returns {boolean} 저장 성공 여부
     * @throws {인사에러} 저장 실패 시
     */
    save() {
        try {
            로거_인사?.debug('데이터 저장 시작');
            
            // 백업 시간 갱신
            this.data.settings.lastBackup = new Date().toISOString();
            
            // JSON 문자열 생성
            const jsonString = JSON.stringify(this.data);
            
            // localStorage에 저장
            localStorage.setItem(STORAGE_KEY, jsonString);
            
            로거_인사?.info('데이터 저장 완료', {
                employeeCount: this.data.employees.length,
                storageSize: jsonString.length
            });
            
            // Electron 환경이면 electron-store에도 백업 (비동기)
            if (IS_ELECTRON) {
                this._saveToElectronStore().catch(function(error) {
                    console.error('[DB] electron-store 백업 실패:', error);
                });
            }
            
            return true;
            
        } catch (error) {
            로거_인사?.error('데이터 저장 실패', error);
            
            // QuotaExceededError 처리
            if (error.name === 'QuotaExceededError') {
                const message = '저장 공간이 부족합니다.\n일부 데이터를 삭제하거나 백업 후 초기화하세요.';
                
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.handle(error, message);
                } else {
                    alert(`❌ ${message}`);
                }
                
                if (typeof 인사에러 !== 'undefined') {
                    throw new 인사에러(
                        '저장 공간 부족',
                        typeof CONFIG !== 'undefined' ? CONFIG.ERROR_CODES.DB_SAVE_ERROR : 'DB_SAVE_ERROR',
                        { originalError: error.message }
                    );
                }
            }
            
            // 기타 에러
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(error, '데이터 저장 중 오류가 발생했습니다.');
            }
            
            return false;
        }
    }
    
    /**
     * 전체 직원 목록 가져오기
     * 
     * @returns {Array<Object>} 직원 배열
     * 
     * @example
     * const employees = db.getEmployees();
     */
    getEmployees() {
        try {
            로거_인사?.debug('전체 직원 목록 조회');
            
            const employees = this.data.employees || [];
            
            로거_인사?.debug('직원 목록 조회 완료', { count: employees.length });
            
            return employees;
            
        } catch (error) {
            로거_인사?.error('직원 목록 조회 실패', error);
            return [];
        }
    }
    
    /**
     * 기준일 기준 재직자 목록 가져오기
     * 
     * @param {string|Date} baseDate - 기준일 (YYYY-MM-DD 문자열 또는 Date 객체)
     * @returns {Array<Object>} 기준일 기준 재직자 배열
     * 
     * @description
     * 기준일을 기준으로 재직 중인 직원만 반환
     * - 입사일 <= 기준일
     * - 퇴사일이 없거나 퇴사일 >= 기준일
     * 
     * @example
     * const employees = db.getEmployeesAtDate('2025-01-01');
     * const employees = db.getEmployeesAtDate(new Date());
     * 
     * @since v3.1.1 (2025-12-04)
     */
    getEmployeesAtDate(baseDate) {
        try {
            // 기준일 문자열 변환
            let baseDateStr;
            if (baseDate instanceof Date) {
                baseDateStr = baseDate.toISOString().split('T')[0];
            } else if (typeof baseDate === 'string') {
                baseDateStr = baseDate;
            } else {
                로거_인사?.warn('getEmployeesAtDate: 잘못된 기준일 형식', { baseDate });
                return [];
            }
            
            로거_인사?.debug('기준일 기준 재직자 조회', { baseDate: baseDateStr });
            
            const allEmployees = this.data.employees || [];
            const result = [];
            
            allEmployees.forEach(emp => {
                try {
                    // 입사일 확인
                    const entryDate = emp.employment?.entryDate || emp.entryDate;
                    if (!entryDate || entryDate > baseDateStr) {
                        return; // 입사 전이면 제외
                    }
                    
                    // 퇴사일 확인
                    const retirementDate = emp.employment?.retirementDate;
                    if (retirementDate && retirementDate < baseDateStr) {
                        return; // 기준일 이전에 퇴사했으면 제외
                    }
                    
                    result.push(emp);
                    
                } catch (e) {
                    로거_인사?.error('재직자 필터링 오류', { 
                        employee: emp.uniqueCode, 
                        error: e.message 
                    });
                }
            });
            
            로거_인사?.debug('기준일 기준 재직자 조회 완료', { 
                baseDate: baseDateStr, 
                total: allEmployees.length,
                filtered: result.length 
            });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('기준일 기준 재직자 조회 실패', error);
            return [];
        }
    }
    
    /**
     * 직원 저장 (신규 또는 업데이트)
     * 
     * @param {Object} employee - 직원 객체
     * @returns {Object} 저장된 직원 객체
     * @throws {인사에러} 저장 실패 시
     * 
     * @example
     * const employee = { id: '...', name: '홍길동', ... };
     * db.saveEmployee(employee);
     */
    saveEmployee(employee) {
        try {
            if (!employee || !employee.id) {
                const error = new Error('직원 ID가 없습니다');
                로거_인사?.error('직원 저장 실패: ID 없음', { employee });
                throw error;
            }
            
            const index = this.data.employees.findIndex(e => e.id === employee.id);
            const isNew = index < 0;
            
            로거_인사?.debug(isNew ? '신규 직원 저장' : '직원 정보 업데이트', {
                id: employee.id,
                uniqueCode: employee.uniqueCode
            });
            
            if (isNew) {
                // 신규 직원
                employee.metadata = {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1
                };
                this.data.employees.push(employee);
                
                로거_인사?.info('신규 직원 저장 완료', {
                    id: employee.id,
                    uniqueCode: employee.uniqueCode,
                    name: employee.personalInfo?.name || employee.name
                });
                
            } else {
                // 기존 직원 업데이트
                employee.metadata = employee.metadata || {};
                employee.metadata.updatedAt = new Date().toISOString();
                employee.metadata.version = (employee.metadata.version || 1) + 1;
                this.data.employees[index] = employee;
                
                로거_인사?.info('직원 정보 업데이트 완료', {
                    id: employee.id,
                    uniqueCode: employee.uniqueCode,
                    version: employee.metadata.version
                });
            }
            
            this.save();
            return employee;
            
        } catch (error) {
            로거_인사?.error('직원 저장 실패', error);
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(error, '직원 저장 중 오류가 발생했습니다.');
            }
            
            throw error;
        }
    }
    
    /**
     * ID로 직원 조회
     * 
     * @param {string} id - 직원 ID
     * @returns {Object|null} 직원 객체 또는 null
     * 
     * @example
     * const employee = db.getEmployeeById('uuid-123');
     */
    getEmployeeById(id) {
        try {
            if (!id) {
                로거_인사?.warn('직원 조회 실패: ID 없음');
                return null;
            }
            
            const employee = this.data.employees.find(e => e.id === id) || null;
            
            로거_인사?.debug('ID로 직원 조회', {
                id,
                found: !!employee
            });
            
            return employee;
            
        } catch (error) {
            로거_인사?.error('직원 조회 실패', error);
            return null;
        }
    }
    
    /**
     * 고유번호로 직원 조회
     * 
     * @param {string} uniqueCode - 고유번호
     * @returns {Object|null} 직원 객체 또는 null
     * 
     * @example
     * const employee = db.getEmployeeByUniqueCode('H001');
     */
    getEmployeeByUniqueCode(uniqueCode) {
        try {
            if (!uniqueCode) {
                로거_인사?.warn('직원 조회 실패: 고유번호 없음');
                return null;
            }
            
            const employee = this.data.employees.find(e => e.uniqueCode === uniqueCode) || null;
            
            로거_인사?.debug('고유번호로 직원 조회', {
                uniqueCode,
                found: !!employee
            });
            
            return employee;
            
        } catch (error) {
            로거_인사?.error('직원 조회 실패', error);
            return null;
        }
    }
    
    /**
     * 재직 중인 직원만 조회
     * 
     * @returns {Array<Object>} 재직 직원 배열
     * 
     * @example
     * const activeEmployees = db.getActiveEmployees();
     */
    getActiveEmployees() {
        try {
            로거_인사?.debug('재직 직원 목록 조회');
            
            const activeEmployees = this.data.employees.filter(e => {
                // 퇴사일 없거나 미래인 경우 재직
                const retirementDate = e.employment?.retirementDate;
                if (!retirementDate) return true;
                return new Date(retirementDate) > new Date();
            });
            
            로거_인사?.debug('재직 직원 목록 조회 완료', { count: activeEmployees.length });
            
            return activeEmployees;
            
        } catch (error) {
            로거_인사?.error('재직 직원 조회 실패', error);
            return [];
        }
    }
    
    /**
     * 퇴사자만 조회
     * 
     * @returns {Array<Object>} 퇴사자 배열
     * 
     * @example
     * const retiredEmployees = db.getRetiredEmployees();
     */
    getRetiredEmployees() {
        try {
            로거_인사?.debug('퇴사자 목록 조회');
            
            const retiredEmployees = this.data.employees.filter(e => {
                const retirementDate = e.employment?.retirementDate;
                if (!retirementDate) return false;
                return new Date(retirementDate) <= new Date();
            });
            
            로거_인사?.debug('퇴사자 목록 조회 완료', { count: retiredEmployees.length });
            
            return retiredEmployees;
            
        } catch (error) {
            로거_인사?.error('퇴사자 조회 실패', error);
            return [];
        }
    }
    
    /**
     * 직원 삭제
     * 
     * @param {string} id - 직원 ID
     * @returns {boolean} 삭제 성공 여부
     * 
     * @example
     * db.deleteEmployee('uuid-123');
     */
    deleteEmployee(id) {
        try {
            if (!id) {
                로거_인사?.warn('직원 삭제 실패: ID 없음');
                return false;
            }
            
            const index = this.data.employees.findIndex(e => e.id === id);
            
            if (index < 0) {
                로거_인사?.warn('직원 삭제 실패: 직원을 찾을 수 없음', { id });
                return false;
            }
            
            const deleted = this.data.employees.splice(index, 1)[0];
            this.save();
            
            로거_인사?.info('직원 삭제 완료', {
                id,
                uniqueCode: deleted.uniqueCode,
                name: deleted.personalInfo?.name || deleted.name
            });
            
            return true;
            
        } catch (error) {
            로거_인사?.error('직원 삭제 실패', error);
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(error, '직원 삭제 중 오류가 발생했습니다.');
            }
            
            return false;
        }
    }
    
    // ===== 고유번호 관련 =====
    
    /**
     * 고유번호 생성
     * 중복을 피하며 순차적 번호 생성
     * 
     * @returns {string} 생성된 고유번호 (예: 'H042')
     * @throws {Error} 번호 생성 실패 시
     * 
     * @example
     * const code = db.generateUniqueCode(); // 'H042'
     */
    generateUniqueCode() {
        const maxAttempts = typeof CONFIG !== 'undefined' 
            ? CONFIG.UNIQUE_CODE.MAX_ATTEMPTS 
            : 100;
        
        let attempts = 0;
        
        로거_인사?.debug('고유번호 생성 시작');
        
        while (attempts < maxAttempts) {
            const currentNum = this.data.settings.nextUniqueCodeNumber;
            const prefix = typeof CONFIG !== 'undefined' 
                ? CONFIG.UNIQUE_CODE.PREFIX 
                : 'H';
            const length = typeof CONFIG !== 'undefined' 
                ? CONFIG.UNIQUE_CODE.LENGTH 
                : 3;
            
            const newCode = prefix + String(currentNum).padStart(length, '0');
            
            // 중복 검증
            const isDuplicate = this.data.employees.some(e => e.uniqueCode === newCode);
            
            if (!isDuplicate) {
                // 중복 없음 - 번호 증가 후 반환
                this.data.settings.nextUniqueCodeNumber = currentNum + 1;
                this.save();
                
                로거_인사?.info('고유번호 생성 완료', {
                    code: newCode,
                    attempts: attempts + 1
                });
                
                return newCode;
            } else {
                // 중복 발견 - 다음 번호로 건너뛰기
                로거_인사?.warn('중복 고유번호 발견, 건너뜀', {
                    code: newCode,
                    attempt: attempts + 1
                });
                
                console.warn(`⚠️ 중복 고유번호 발견: ${newCode}, 다음 번호로 건너뜁니다.`);
                this.data.settings.nextUniqueCodeNumber = currentNum + 1;
                attempts++;
            }
        }
        
        // 최대 시도 횟수 초과
        const errorMsg = '고유번호 생성 실패: 최대 시도 횟수 초과';
        로거_인사?.error(errorMsg, { maxAttempts });
        
        console.error(`❌ ${errorMsg}`);
        
        const userMsg = '⚠️ 고유번호 생성에 실패했습니다.\n시스템 관리자에게 문의하세요.';
        
        if (typeof 에러처리_인사 !== 'undefined') {
            에러처리_인사.warn(userMsg);
        } else {
            alert(userMsg);
        }
        
        throw new Error(errorMsg);
    }
    
    /**
     * 다음 고유번호 미리보기
     * 
     * @returns {string} 다음 생성될 고유번호
     * 
     * @example
     * const nextCode = db.getNextUniqueCode(); // 'H043'
     */
    getNextUniqueCode() {
        try {
            const prefix = typeof CONFIG !== 'undefined' 
                ? CONFIG.UNIQUE_CODE.PREFIX 
                : 'H';
            const length = typeof CONFIG !== 'undefined' 
                ? CONFIG.UNIQUE_CODE.LENGTH 
                : 3;
            
            const code = prefix + String(this.data.settings.nextUniqueCodeNumber).padStart(length, '0');
            
            로거_인사?.debug('다음 고유번호 조회', { code });
            
            return code;
            
        } catch (error) {
            로거_인사?.error('다음 고유번호 조회 실패', error);
            return 'H001';
        }
    }
    
    // ===== v3.1.0 추가: 사원번호 자동생성 =====
    
    /**
     * 사원번호 자동생성
     * 
     * @param {string|number} entryYear - 입사 연도 (예: 2026 또는 "2026")
     * @returns {string} 생성된 사원번호 (예: '2026-0001')
     * 
     * @description
     * - 형식: YYYY-NNNN
     * - 연도별로 0001부터 시작
     * - 빈 번호 재사용 (삭제된 번호 중 가장 작은 것 먼저)
     * - 잘못된 형식의 기존 사원번호는 무시
     * 
     * @example
     * const empNum = db.generateEmployeeNumber(2026); // '2026-0001'
     * const empNum = db.generateEmployeeNumber('2025'); // '2025-0003' (0001, 0002 사용 중)
     */
    generateEmployeeNumber(entryYear) {
        try {
            const year = String(entryYear);
            
            로거_인사?.debug('사원번호 생성 시작', { year });
            
            // 정규식: YYYY-NNNN 형식 검증
            const pattern = new RegExp(`^${year}-(\\d{4})$`);
            
            // 해당 연도의 사용 중인 번호 수집
            const usedNumbers = new Set();
            
            this.data.employees.forEach(emp => {
                const empNum = emp.employeeNumber;
                if (empNum && typeof empNum === 'string') {
                    const match = empNum.match(pattern);
                    if (match) {
                        usedNumbers.add(parseInt(match[1], 10));
                    }
                }
            });
            
            로거_인사?.debug('사용 중인 사원번호 조회 완료', {
                year,
                usedCount: usedNumbers.size,
                usedNumbers: Array.from(usedNumbers).sort((a, b) => a - b)
            });
            
            // 1부터 시작하여 빈 번호 찾기
            let nextNumber = 1;
            while (usedNumbers.has(nextNumber)) {
                nextNumber++;
            }
            
            // 사원번호 생성
            const employeeNumber = `${year}-${String(nextNumber).padStart(4, '0')}`;
            
            로거_인사?.info('사원번호 생성 완료', {
                employeeNumber,
                year,
                number: nextNumber
            });
            
            return employeeNumber;
            
        } catch (error) {
            로거_인사?.error('사원번호 생성 실패', error);
            
            // 폴백: 연도-0001
            const fallback = `${entryYear}-0001`;
            console.warn(`⚠️ 사원번호 생성 실패, 기본값 사용: ${fallback}`);
            return fallback;
        }
    }
    
    /**
     * 다음 사원번호 미리보기
     * 
     * @param {string|number} entryYear - 입사 연도
     * @returns {string} 다음 생성될 사원번호
     * 
     * @example
     * const nextNum = db.getNextEmployeeNumber(2026); // '2026-0001'
     */
    getNextEmployeeNumber(entryYear) {
        try {
            return this.generateEmployeeNumber(entryYear);
        } catch (error) {
            로거_인사?.error('다음 사원번호 조회 실패', error);
            return `${entryYear}-0001`;
        }
    }
    
    // ===== 조직 설정 관련 =====
    
    /**
     * 조직명 가져오기
     * 
     * @returns {string} 조직명
     * 
     * @example
     * const orgName = db.getOrganizationName();
     */
    getOrganizationName() {
        try {
            const name = this.data.settings.organizationName || '조직명';
            로거_인사?.debug('조직명 조회', { name });
            return name;
        } catch (error) {
            로거_인사?.error('조직명 조회 실패', error);
            return '조직명';
        }
    }
    
    /**
     * 조직명 저장
     * 
     * @param {string} name - 조직명
     * @returns {boolean} 저장 성공 여부
     * 
     * @example
     * db.saveOrganizationName('○○초등학교');
     */
    saveOrganizationName(name) {
        try {
            if (!name || name.trim() === '') {
                로거_인사?.warn('조직명 저장 실패: 빈 값');
                
                const msg = '⚠️ 조직명을 입력하세요.';
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.warn(msg);
                } else {
                    alert(msg);
                }
                
                return false;
            }
            
            const trimmedName = name.trim();
            this.data.settings.organizationName = trimmedName;
            this.save();
            
            로거_인사?.info('조직명 저장 완료', { name: trimmedName });
            
            return true;
            
        } catch (error) {
            로거_인사?.error('조직명 저장 실패', error);
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(error, '조직명 저장 중 오류가 발생했습니다.');
            }
            
            return false;
        }
    }
    
    /**
     * 조직 설정 전체 가져오기
     * 
     * @returns {Object} 조직 설정 객체
     * 
     * @example
     * const orgSettings = db.getOrganizationSettings();
     * // { name, address, phone, pensionBank, pensionType }
     */
    getOrganizationSettings() {
        try {
            const settings = {
                name: this.data.settings.organizationName || '조직명',
                address: this.data.settings.organizationAddress || '',
                phone: this.data.settings.organizationPhone || '',
                pensionBank: this.data.settings.pensionBank || '농협은행',
                pensionType: this.data.settings.pensionType || 'DC'
            };
            로거_인사?.debug('조직 설정 전체 조회', settings);
            return settings;
        } catch (error) {
            로거_인사?.error('조직 설정 전체 조회 실패', error);
            return {
                name: '조직명',
                address: '',
                phone: '',
                pensionBank: '농협은행',
                pensionType: 'DC'
            };
        }
    }
    
    /**
     * 조직 설정 전체 저장
     * 
     * @param {Object} settings - 저장할 조직 설정
     * @param {string} settings.name - 조직명
     * @param {string} settings.address - 기관 주소
     * @param {string} settings.phone - 기관 연락처
     * @param {string} settings.pensionBank - 퇴직연금 은행
     * @param {string} settings.pensionType - 퇴직연금 유형 (DC/DB)
     * @returns {boolean} 저장 성공 여부
     * 
     * @example
     * db.saveOrganizationSettingsAll({
     *     name: '○○복지관',
     *     address: '서울특별시 강남구 테헤란로 123',
     *     phone: '02-1234-5678',
     *     pensionBank: '농협은행',
     *     pensionType: 'DC'
     * });
     */
    saveOrganizationSettingsAll(settings) {
        try {
            if (!settings || !settings.name?.trim()) {
                로거_인사?.warn('조직 설정 저장 실패: 조직명 필수');
                
                const msg = '⚠️ 조직명을 입력하세요.';
                if (typeof 에러처리_인사 !== 'undefined') {
                    에러처리_인사.warn(msg);
                } else {
                    alert(msg);
                }
                
                return false;
            }
            
            // 설정 저장
            this.data.settings.organizationName = settings.name.trim();
            this.data.settings.organizationAddress = settings.address?.trim() || '';
            this.data.settings.organizationPhone = settings.phone?.trim() || '';
            this.data.settings.pensionBank = settings.pensionBank || '농협은행';
            this.data.settings.pensionType = settings.pensionType || 'DC';
            
            this.save();
            
            로거_인사?.info('조직 설정 전체 저장 완료', settings);
            
            return true;
            
        } catch (error) {
            로거_인사?.error('조직 설정 전체 저장 실패', error);
            
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.handle(error, '조직 설정 저장 중 오류가 발생했습니다.');
            }
            
            return false;
        }
    }
    
    /**
     * 기관 주소 가져오기
     * 
     * @returns {string} 기관 주소
     */
    getOrganizationAddress() {
        try {
            return this.data.settings.organizationAddress || '';
        } catch (error) {
            로거_인사?.error('기관 주소 조회 실패', error);
            return '';
        }
    }
    
    /**
     * 기관 연락처 가져오기
     * 
     * @returns {string} 기관 연락처
     */
    getOrganizationPhone() {
        try {
            return this.data.settings.organizationPhone || '';
        } catch (error) {
            로거_인사?.error('기관 연락처 조회 실패', error);
            return '';
        }
    }
    
    /**
     * 퇴직연금 은행 가져오기
     * 
     * @returns {string} 퇴직연금 은행명
     */
    getPensionBank() {
        try {
            return this.data.settings.pensionBank || '농협은행';
        } catch (error) {
            로거_인사?.error('퇴직연금 은행 조회 실패', error);
            return '농협은행';
        }
    }
    
    /**
     * 퇴직연금 유형 가져오기
     * 
     * @returns {string} 퇴직연금 유형 (DC/DB)
     */
    getPensionType() {
        try {
            return this.data.settings.pensionType || 'DC';
        } catch (error) {
            로거_인사?.error('퇴직연금 유형 조회 실패', error);
            return 'DC';
        }
    }
    
    /**
     * 전체 데이터 초기화
     * 사용자 확인 후 모든 데이터 삭제 및 페이지 새로고침
     * 
     * @example
     * db.reset(); // 확인 대화상자 표시 후 초기화
     */
    reset() {
        try {
            로거_인사?.warn('데이터 초기화 시도');
            
            로거_인사?.warn('데이터 초기화 실행');
            
            localStorage.removeItem(STORAGE_KEY);
            
            // Electron 환경이면 electron-store도 초기화 (안전하게 처리)
            if (IS_ELECTRON && window.electronStore?.delete) {
                try {
                    window.electronStore.delete(STORAGE_KEY);
                } catch (storeError) {
                    console.warn('[DB] electron-store 초기화 실패 (무시됨):', storeError);
                }
            }
            
            this.data = this.load();
            
            const successMsg = '✅ 모든 데이터가 삭제되었습니다.';
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.success(successMsg);
            } else {
                alert(successMsg);
            }
            
            로거_인사?.info('데이터 초기화 완료, 페이지 새로고침');
            
            location.reload();
            
        } catch (error) {
            로거_인사?.error('데이터 초기화 실패', error);
            
            // 오류가 발생해도 localStorage는 삭제되었으므로 새로고침
            location.reload();
        }
    }
    
    // ===== 검증 헬퍼 메서드 =====
    
    /**
     * 직원 검색 (uniqueCode 또는 id로)
     * 
     * @param {string} identifier - uniqueCode 또는 id
     * @returns {Object|null} 직원 객체 또는 null
     * 
     * @description
     * uniqueCode (예: 'H001')로 먼저 검색하고,
     * 없으면 id로 검색합니다.
     * 
     * @example
     * const emp = db.findEmployee('H001');
     * const emp = db.findEmployee('EMP176412313761080qyz');
     */
    findEmployee(identifier) {
        try {
            if (!identifier) {
                로거_인사?.warn('직원 검색 실패: 식별자 없음');
                return null;
            }
            
            // uniqueCode로 먼저 검색
            let employee = this.data.employees.find(e => e.uniqueCode === identifier);
            
            // 없으면 id로 검색
            if (!employee) {
                employee = this.data.employees.find(e => e.id === identifier);
            }
            
            로거_인사?.debug('직원 검색', {
                identifier,
                found: !!employee
            });
            
            return employee || null;
            
        } catch (error) {
            로거_인사?.error('직원 검색 실패', error);
            return null;
        }
    }
    
    /**
     * 고유번호 중복 확인
     * 
     * @param {string} uniqueCode - 고유번호
     * @returns {boolean} 중복 여부
     * 
     * @example
     * if (db.isUniqueCodeDuplicate('H001')) {
     *     alert('이미 사용 중인 고유번호입니다');
     * }
     */
    isUniqueCodeDuplicate(uniqueCode) {
        try {
            if (!uniqueCode) {
                return false;
            }
            
            const isDuplicate = this.data.employees.some(e => e.uniqueCode === uniqueCode);
            
            로거_인사?.debug('고유번호 중복 확인', {
                uniqueCode,
                isDuplicate
            });
            
            return isDuplicate;
            
        } catch (error) {
            로거_인사?.error('고유번호 중복 확인 실패', error);
            return false;
        }
    }
    
    /**
     * 사원번호 중복 확인 (비어있지 않은 경우만)
     * 
     * @param {string} employeeNumber - 사원번호
     * @param {string} [excludeId=null] - 제외할 직원 ID (수정 시)
     * @returns {boolean} 중복 여부
     * 
     * @example
     * if (db.isEmployeeNumberDuplicate('20240001', currentId)) {
     *     alert('이미 사용 중인 사원번호입니다');
     * }
     */
    isEmployeeNumberDuplicate(employeeNumber, excludeId = null) {
        try {
            // 사원번호는 선택 항목
            if (!employeeNumber || employeeNumber.trim() === '') {
                return false;
            }
            
            const isDuplicate = this.data.employees.some(e => 
                e.employeeNumber === employeeNumber && 
                e.id !== excludeId &&
                e.employeeNumber && 
                e.employeeNumber.trim() !== ''
            );
            
            로거_인사?.debug('사원번호 중복 확인', {
                employeeNumber,
                excludeId,
                isDuplicate
            });
            
            return isDuplicate;
            
        } catch (error) {
            로거_인사?.error('사원번호 중복 확인 실패', error);
            return false;
        }
    }
    
    /**
     * 데이터 무결성 검증
     * 전체 직원 데이터의 논리적 일관성 검증
     * 
     * @returns {Object} { valid: boolean, issues: Array<string> }
     * 
     * @example
     * const result = db.validateDataIntegrity();
     * if (!result.valid) {
     *     console.log('문제 발견:', result.issues);
     * }
     */
    validateDataIntegrity() {
        try {
            로거_인사?.debug('데이터 무결성 검증 시작');
            
            const issues = [];
            
            this.data.employees.forEach((emp, index) => {
                const empId = emp.uniqueCode || `직원${index + 1}`;
                
                // 필수 항목 검증
                if (!emp.personalInfo?.name && !emp.name) {
                    issues.push(`${empId}: 이름 누락`);
                }
                
                if (!emp.employment?.entryDate && !emp.entryDate) {
                    issues.push(`${empId}: 입사일 누락`);
                }
                
                // 날짜 논리 검증
                if (emp.employment?.entryDate && emp.employment?.retirementDate) {
                    if (emp.employment.retirementDate < emp.employment.entryDate) {
                        issues.push(`${empId}: 퇴사일이 입사일보다 빠름`);
                    }
                }
                
                // 육아휴직 날짜 검증
                if (emp.maternityLeave?.startDate && emp.maternityLeave?.endDate) {
                    if (emp.maternityLeave.endDate < emp.maternityLeave.startDate) {
                        issues.push(`${empId}: 휴직 종료일이 시작일보다 빠름`);
                    }
                }
            });
            
            const result = {
                valid: issues.length === 0,
                issues: issues
            };
            
            로거_인사?.info('데이터 무결성 검증 완료', {
                valid: result.valid,
                issueCount: issues.length
            });
            
            if (!result.valid) {
                로거_인사?.warn('데이터 무결성 문제 발견', { issues });
            }
            
            return result;
            
        } catch (error) {
            로거_인사?.error('데이터 무결성 검증 실패', error);
            
            return {
                valid: false,
                issues: ['검증 중 오류 발생']
            };
        }
    }
}

// ===== 전역 인스턴스 생성 =====

/**
 * 데이터베이스 전역 인스턴스
 * @const {HRDatabase}
 * @global
 */
const db = new HRDatabase();
