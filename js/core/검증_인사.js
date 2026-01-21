/**
 * 검증_인사.js - 프로덕션급 리팩토링
 * 
 * 데이터 유효성 검증 모듈
 * - 날짜 검증 (형식, 범위, 논리적 일관성)
 * - 문자열 검증 (빈값, 길이)
 * - 숫자 검증 (범위, 타입)
 * - 비즈니스 로직 검증 (퇴사일, 육아휴직, 인사발령 등)
 * - 중복 검증 (고유번호, 사원번호)
 * 
 * @version 3.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v3.0 - 프로덕션급 리팩토링
 *   - 상수 사용 (CONFIG)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - JSDoc 주석 추가
 *   - 검증 메시지 통합
 * 
 * [하위 호환성]
 * - 모든 기존 메서드명 유지
 * - 기존 API 100% 호환
 * - 전역 객체 'Validator' 유지
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 */

// ===== 검증 모듈 =====

/**
 * 데이터 유효성 검증 유틸리티
 * @namespace Validator
 */
const Validator = {
    
    // ===== 날짜 검증 =====
    
    /**
     * 날짜 형식 검증 (YYYY-MM-DD)
     * 
     * @param {string} dateStr - 검증할 날짜 문자열
     * @returns {boolean} 유효성 여부
     * 
     * @example
     * Validator.isValidDate('2024-11-04'); // true
     * Validator.isValidDate('2024-13-01'); // false
     * Validator.isValidDate('2024-02-30'); // false
     */
    isValidDate(dateStr) {
        try {
            if (!dateStr) {
                로거_인사?.debug('날짜 검증: 빈 값');
                return false;
            }
            
            // 형식 검증 (YYYY-MM-DD)
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(dateStr)) {
                로거_인사?.debug('날짜 검증 실패: 형식 오류', { dateStr });
                return false;
            }
            
            // 날짜 유효성 검증
            const date = new Date(dateStr);
            const timestamp = date.getTime();
            
            if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
                로거_인사?.debug('날짜 검증 실패: 유효하지 않은 날짜', { dateStr });
                return false;
            }
            
            // ISO 날짜로 재변환하여 비교 (2024-02-30 같은 잘못된 날짜 걸러냄)
            const isValid = dateStr === date.toISOString().split('T')[0];
            
            로거_인사?.debug('날짜 검증', { dateStr, isValid });
            
            return isValid;
            
        } catch (error) {
            로거_인사?.error('날짜 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * date1이 date2보다 이전인지 확인
     * 
     * @param {string} date1 - 비교할 날짜 1
     * @param {string} date2 - 비교할 날짜 2
     * @returns {boolean} date1 < date2
     * 
     * @example
     * Validator.isDateBefore('2024-01-01', '2024-12-31'); // true
     */
    isDateBefore(date1, date2) {
        try {
            const result = new Date(date1) < new Date(date2);
            로거_인사?.debug('날짜 이전 비교', { date1, date2, result });
            return result;
        } catch (error) {
            로거_인사?.error('날짜 비교 중 오류', error);
            return false;
        }
    },
    
    /**
     * date1이 date2보다 이후인지 확인
     * 
     * @param {string} date1 - 비교할 날짜 1
     * @param {string} date2 - 비교할 날짜 2
     * @returns {boolean} date1 > date2
     * 
     * @example
     * Validator.isDateAfter('2024-12-31', '2024-01-01'); // true
     */
    isDateAfter(date1, date2) {
        try {
            const result = new Date(date1) > new Date(date2);
            로거_인사?.debug('날짜 이후 비교', { date1, date2, result });
            return result;
        } catch (error) {
            로거_인사?.error('날짜 비교 중 오류', error);
            return false;
        }
    },
    
    /**
     * date1과 date2가 같은지 확인
     * 
     * @param {string} date1 - 비교할 날짜 1
     * @param {string} date2 - 비교할 날짜 2
     * @returns {boolean} date1 === date2
     * 
     * @example
     * Validator.isSameDate('2024-11-04', '2024-11-04'); // true
     */
    isSameDate(date1, date2) {
        try {
            const result = date1 === date2;
            로거_인사?.debug('날짜 동일 비교', { date1, date2, result });
            return result;
        } catch (error) {
            로거_인사?.error('날짜 비교 중 오류', error);
            return false;
        }
    },
    
    /**
     * 날짜가 유효한 범위 내인지 확인 (1900-2100)
     * 
     * @param {string} dateStr - 검증할 날짜
     * @returns {boolean} 범위 내 여부
     * 
     * @example
     * Validator.isDateInValidRange('2024-11-04'); // true
     * Validator.isDateInValidRange('1899-12-31'); // false
     */
    isDateInValidRange(dateStr) {
        try {
            // 빈 값 체크
            if (!dateStr) {
                로거_인사?.debug('날짜 범위 검증: 빈 값');
                return false;
            }
            
            const minYear = typeof CONFIG !== 'undefined' 
                ? CONFIG.DATE_RANGE.MIN_YEAR 
                : 1900;
            const maxYear = typeof CONFIG !== 'undefined' 
                ? CONFIG.DATE_RANGE.MAX_YEAR 
                : 2100;
            
            // 연도 추출 (YYYY-MM-DD 또는 YYYY/MM/DD 형식 모두 지원)
            const yearMatch = dateStr.match(/^(\d{4})/);
            if (!yearMatch) {
                로거_인사?.debug('날짜 범위 검증: 연도 추출 실패', { dateStr });
                return false;
            }
            
            const year = parseInt(yearMatch[1]);
            const isValid = year >= minYear && year <= maxYear;
            
            로거_인사?.debug('날짜 범위 검증', { 
                dateStr, 
                year, 
                minYear, 
                maxYear, 
                isValid 
            });
            
            return isValid;
            
        } catch (error) {
            로거_인사?.error('날짜 범위 검증 중 오류', error);
            return false;
        }
    },
    
    // ===== 퇴사/입사 날짜 검증 =====
    
    /**
     * 퇴사일이 입사일 이후인지 검증
     * 
     * @param {string} entryDate - 입사일
     * @param {string} retirementDate - 퇴사일
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.validateRetirementDate('2024-01-01', '2024-12-31');
     * if (!result.valid) {
     * }
     */
    validateRetirementDate(entryDate, retirementDate) {
        try {
            로거_인사?.debug('퇴사일 검증 시작', { entryDate, retirementDate });
            
            const errors = [];
            
            // 입사일 검증
            if (!this.isValidDate(entryDate)) {
                errors.push('입사일 형식이 올바르지 않습니다.');
            }
            
            // 퇴사일 검증
            if (!this.isValidDate(retirementDate)) {
                errors.push('퇴사일 형식이 올바르지 않습니다.');
            }
            
            // 형식 오류가 있으면 논리 검증 스킵
            if (errors.length > 0) {
                로거_인사?.warn('퇴사일 검증 실패: 형식 오류', { errors });
                return { valid: false, errors };
            }
            
            // 날짜 범위 검증 (1900~2100)
            if (!this.isDateInValidRange(retirementDate)) {
                errors.push('퇴사일이 유효한 범위(1900~2100)를 벗어났습니다.');
            }
            
            // 논리 검증: 퇴사일이 입사일 이후인지
            if (this.isDateBefore(retirementDate, entryDate)) {
                errors.push(`퇴사일(${retirementDate})이 입사일(${entryDate})보다 빠릅니다.`);
            }
            
            const result = {
                valid: errors.length === 0,
                errors
            };
            
            if (!result.valid) {
                로거_인사?.warn('퇴사일 검증 실패', result);
            } else {
                로거_인사?.debug('퇴사일 검증 성공');
            }
            
            return result;
            
        } catch (error) {
            로거_인사?.error('퇴사일 검증 중 오류', error);
            return {
                valid: false,
                errors: ['검증 중 오류가 발생했습니다.']
            };
        }
    },
    
    // ===== 육아휴직 날짜 검증 =====
    
    /**
     * 육아휴직 기간 검증
     * 
     * @param {string} startDate - 휴직 시작일
     * @param {string} endDate - 휴직 종료일
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.validateMaternityLeave('2024-01-01', '2024-12-31');
     */
    validateMaternityLeave(startDate, endDate) {
        try {
            로거_인사?.debug('육아휴직 검증 시작', { startDate, endDate });
            
            const errors = [];
            
            // 시작일 검증
            if (!this.isValidDate(startDate)) {
                errors.push('휴직 시작일 형식이 올바르지 않습니다.');
            }
            
            // 종료일 검증
            if (!this.isValidDate(endDate)) {
                errors.push('휴직 종료일 형식이 올바르지 않습니다.');
            }
            
            // 형식 오류가 있으면 논리 검증 스킵
            if (errors.length > 0) {
                로거_인사?.warn('육아휴직 검증 실패: 형식 오류', { errors });
                return { valid: false, errors };
            }
            
            // 논리 검증: 종료일이 시작일 이후인지
            if (this.isDateBefore(endDate, startDate)) {
                errors.push(`휴직 종료일(${endDate})이 시작일(${startDate})보다 빠릅니다.`);
            }
            
            // 기간 검증: 너무 긴지 확인 (3년 초과)
            const maxDays = typeof CONFIG !== 'undefined'
                ? CONFIG.MATERNITY.MAX_DAYS
                : 1095; // 3년
            
            const diffMs = new Date(endDate) - new Date(startDate);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            
            if (diffDays > maxDays) {
                const maxYears = Math.floor(maxDays / 365);
                errors.push(`휴직 기간이 ${maxYears}년을 초과합니다. 날짜를 확인해주세요.`);
            }
            
            const result = {
                valid: errors.length === 0,
                errors
            };
            
            if (!result.valid) {
                로거_인사?.warn('육아휴직 검증 실패', result);
            } else {
                로거_인사?.debug('육아휴직 검증 성공', { diffDays });
            }
            
            return result;
            
        } catch (error) {
            로거_인사?.error('육아휴직 검증 중 오류', error);
            return {
                valid: false,
                errors: ['검증 중 오류가 발생했습니다.']
            };
        }
    },
    
    // ===== 인사발령 날짜 검증 =====
    
    /**
     * 인사발령일 검증
     * 
     * @param {string} entryDate - 입사일
     * @param {string} assignmentDate - 발령일
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.validateAssignmentDate('2024-01-01', '2024-06-01');
     */
    validateAssignmentDate(entryDate, assignmentDate) {
        try {



            로거_인사?.debug('인사발령 검증 시작', { entryDate, assignmentDate });
            
            const errors = [];
            
            // 입사일 검증
            if (!this.isValidDate(entryDate)) {
                errors.push('입사일 형식이 올바르지 않습니다.');

            }
            
            // 발령일 검증
            if (!this.isValidDate(assignmentDate)) {
                errors.push('발령일 형식이 올바르지 않습니다.');

            }
            
            // 형식 오류가 있으면 논리 검증 스킵
            if (errors.length > 0) {

                로거_인사?.warn('인사발령 검증 실패: 형식 오류', { errors });
                return { valid: false, errors };
            }
            
            // 논리 검증: 발령일이 입사일 이전이 아닌지 (같은 날은 허용)
            const isBeforeResult = this.isDateBefore(assignmentDate, entryDate);

            if (isBeforeResult) {
                errors.push(`💡 발령일은 입사일(${entryDate}) 이후여야 합니다.`);

            } else {

            }
            
            const result = {
                valid: errors.length === 0,
                errors
            };

            if (!result.valid) {

            }
            
            if (!result.valid) {
                로거_인사?.warn('인사발령 검증 실패', result);
            } else {
                로거_인사?.debug('인사발령 검증 성공');
            }
            
            return result;
            
        } catch (error) {
            console.error('🔍 [Validator.validateAssignmentDate] 예외 발생:', error);
            로거_인사?.error('인사발령 검증 중 오류', error);
            return {
                valid: false,
                errors: ['검증 중 오류가 발생했습니다.']
            };
        }
    },
    
    // ===== 과거 경력 날짜 검증 =====
    
    /**
     * 과거 경력 기간 검증
     * 
     * @param {string} startDate - 경력 시작일
     * @param {string} endDate - 경력 종료일
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.validateCareerPeriod('2020-01-01', '2023-12-31');
     */
    validateCareerPeriod(startDate, endDate) {
        try {
            로거_인사?.debug('경력 기간 검증 시작', { startDate, endDate });
            
            const errors = [];
            
            // 시작일 검증
            if (!this.isValidDate(startDate)) {
                errors.push('경력 시작일 형식이 올바르지 않습니다.');
            }
            
            // 종료일 검증
            if (!this.isValidDate(endDate)) {
                errors.push('경력 종료일 형식이 올바르지 않습니다.');
            }
            
            // 형식 오류가 있으면 논리 검증 스킵
            if (errors.length > 0) {
                로거_인사?.warn('경력 기간 검증 실패: 형식 오류', { errors });
                return { valid: false, errors };
            }
            
            // 논리 검증: 종료일이 시작일 이후인지
            if (this.isDateBefore(endDate, startDate)) {
                errors.push(`경력 종료일(${endDate})이 시작일(${startDate})보다 빠릅니다.`);
            }
            
            const result = {
                valid: errors.length === 0,
                errors
            };
            
            if (!result.valid) {
                로거_인사?.warn('경력 기간 검증 실패', result);
            } else {
                로거_인사?.debug('경력 기간 검증 성공');
            }
            
            return result;
            
        } catch (error) {
            로거_인사?.error('경력 기간 검증 중 오류', error);
            return {
                valid: false,
                errors: ['검증 중 오류가 발생했습니다.']
            };
        }
    },
    
    // ===== 문자열 검증 =====
    
    /**
     * 빈 문자열 검증
     * 
     * @param {string} str - 검증할 문자열
     * @returns {boolean} 비어있지 않으면 true
     * 
     * @example
     * Validator.isNotEmpty('홍길동'); // true
     * Validator.isNotEmpty('   '); // false
     * Validator.isNotEmpty(''); // false
     */
    isNotEmpty(str) {
        try {
            const result = str !== null && str !== undefined && str.trim() !== '';
            로거_인사?.debug('빈 값 검증', { str, result });
            return result;
        } catch (error) {
            로거_인사?.error('빈 값 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * 최소/최대 길이 검증
     * 
     * @param {string} str - 검증할 문자열
     * @param {number} [min=0] - 최소 길이
     * @param {number} [max=Infinity] - 최대 길이
     * @returns {boolean} 유효성 여부
     * 
     * @example
     * Validator.isLengthValid('홍길동', 2, 10); // true
     * Validator.isLengthValid('홍', 2, 10); // false
     */
    isLengthValid(str, min = 0, max = Infinity) {
        try {
            if (!str) {
                const result = min === 0;
                로거_인사?.debug('길이 검증: 빈 값', { min, result });
                return result;
            }
            
            const length = str.trim().length;
            const result = length >= min && length <= max;
            
            로거_인사?.debug('길이 검증', { str, length, min, max, result });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('길이 검증 중 오류', error);
            return false;
        }
    },
    
    // ===== 숫자 검증 =====
    
    /**
     * 숫자 범위 검증
     * 
     * @param {number|string} num - 검증할 숫자
     * @param {number} min - 최소값
     * @param {number} max - 최대값
     * @returns {boolean} 범위 내 여부
     * 
     * @example
     * Validator.isNumberInRange(50, 0, 100); // true
     * Validator.isNumberInRange(150, 0, 100); // false
     */
    isNumberInRange(num, min, max) {
        try {
            const number = parseFloat(num);
            
            if (isNaN(number)) {
                로거_인사?.debug('숫자 범위 검증: NaN', { num });
                return false;
            }
            
            const result = number >= min && number <= max;
            
            로거_인사?.debug('숫자 범위 검증', { num, number, min, max, result });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('숫자 범위 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * 양의 정수 검증
     * 
     * @param {number|string} num - 검증할 숫자
     * @returns {boolean} 양의 정수 여부
     * 
     * @example
     * Validator.isPositiveInteger(5); // true
     * Validator.isPositiveInteger(0); // false
     * Validator.isPositiveInteger(-5); // false
     */
    isPositiveInteger(num) {
        try {
            const number = parseInt(num);
            const result = Number.isInteger(number) && number > 0;
            
            로거_인사?.debug('양의 정수 검증', { num, number, result });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('양의 정수 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * 호봉 검증 (1~99)
     * 
     * @param {number|string} rank - 검증할 호봉
     * @returns {boolean} 유효성 여부
     * 
     * @example
     * Validator.isValidRank(15); // true
     * Validator.isValidRank(0); // false
     * Validator.isValidRank(100); // false
     */
    isValidRank(rank) {
        try {
            const minRank = typeof CONFIG !== 'undefined'
                ? CONFIG.RANK.MIN
                : 1;
            const maxRank = typeof CONFIG !== 'undefined'
                ? CONFIG.RANK.MAX
                : 99;
            
            const result = this.isNumberInRange(rank, minRank, maxRank) && 
                          Number.isInteger(parseFloat(rank));
            
            로거_인사?.debug('호봉 검증', { rank, minRank, maxRank, result });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('호봉 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * 인정률 검증 (0~100%)
     * 
     * @param {number|string} rate - 검증할 인정률
     * @returns {boolean} 유효성 여부
     * 
     * @example
     * Validator.isValidRate(80); // true
     * Validator.isValidRate(150); // false
     */
    isValidRate(rate) {
        try {
            const result = this.isNumberInRange(rate, 0, 100);
            
            로거_인사?.debug('인정률 검증', { rate, result });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('인정률 검증 중 오류', error);
            return false;
        }
    },
    
    // ===== 필수 항목 검증 =====
    
    /**
     * 직원 등록 필수 항목 검증
     * 
     * @param {Object} data - 직원 데이터
     * @param {string} data.name - 성명
     * @param {string} data.dept - 부서
     * @param {string} data.position - 직위
     * @param {string} data.grade - 직급 ⭐ v3.4.0 추가
     * @param {string} data.jobType - 직종 ⭐ v3.4.0 추가
     * @param {string} data.entryDate - 입사일
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.validateEmployeeRegistration({
     *     name: '홍길동',
     *     dept: '총무부',
     *     position: '주임',
     *     grade: '2급',
     *     jobType: '사회복지사',
     *     entryDate: '2024-01-01'
     * });
     */
    validateEmployeeRegistration(data) {
        try {
            로거_인사?.debug('직원 등록 검증 시작', { data });
            
            const errors = [];
            
            // 성명 검증
            if (!this.isNotEmpty(data.name)) {
                errors.push('성명을 입력해주세요.');
            }
            
            // 부서 검증
            if (!this.isNotEmpty(data.dept)) {
                errors.push('부서를 입력해주세요.');
            }
            
            // 직위 검증
            if (!this.isNotEmpty(data.position)) {
                errors.push('직위를 입력해주세요.');
            }
            
            // ⭐ v3.4.0: 직급 검증 추가
            if (!this.isNotEmpty(data.grade)) {
                errors.push('직급을 입력해주세요.');
            }
            
            // ⭐ v3.4.0: 직종 검증 추가
            if (!this.isNotEmpty(data.jobType)) {
                errors.push('직종을 입력해주세요.');
            }
            
            // 입사일 형식 검증
            if (!this.isValidDate(data.entryDate)) {
                errors.push('입사일을 올바른 형식(YYYY-MM-DD)으로 입력해주세요.');
            }
            
            // 입사일 범위 검증
            if (!this.isDateInValidRange(data.entryDate)) {
                const minYear = typeof CONFIG !== 'undefined'
                    ? CONFIG.DATE_RANGE.MIN_YEAR
                    : 1900;
                const maxYear = typeof CONFIG !== 'undefined'
                    ? CONFIG.DATE_RANGE.MAX_YEAR
                    : 2100;
                errors.push(`입사일이 유효한 범위(${minYear}~${maxYear})를 벗어났습니다.`);
            }
            
            const result = {
                valid: errors.length === 0,
                errors
            };
            
            if (!result.valid) {
                로거_인사?.warn('직원 등록 검증 실패', result);
            } else {
                로거_인사?.debug('직원 등록 검증 성공');
            }
            
            return result;
            
        } catch (error) {
            로거_인사?.error('직원 등록 검증 중 오류', error);
            return {
                valid: false,
                errors: ['검증 중 오류가 발생했습니다.']
            };
        }
    },
    
    // ===== 중복 검증 =====
    
    /**
     * 고유번호 중복 검증
     * 
     * @param {string} uniqueCode - 고유번호
     * @param {Array<Object>} employees - 직원 배열
     * @param {string} [excludeId=null] - 제외할 직원 ID (수정 시)
     * @returns {boolean} 중복 여부
     * 
     * @example
     * if (Validator.isDuplicateUniqueCode('H001', employees)) {
     *     alert('이미 사용 중인 고유번호입니다');
     * }
     */
    isDuplicateUniqueCode(uniqueCode, employees, excludeId = null) {
        try {
            const isDuplicate = employees.some(emp => 
                emp.uniqueCode === uniqueCode && emp.id !== excludeId
            );
            
            로거_인사?.debug('고유번호 중복 검증', { 
                uniqueCode, 
                excludeId, 
                isDuplicate 
            });
            
            return isDuplicate;
            
        } catch (error) {
            로거_인사?.error('고유번호 중복 검증 중 오류', error);
            return false;
        }
    },
    
    /**
     * 사원번호 중복 검증 (선택적)
     * 
     * @param {string} employeeNumber - 사원번호
     * @param {Array<Object>} employees - 직원 배열
     * @param {string} [excludeId=null] - 제외할 직원 ID (수정 시)
     * @returns {boolean} 중복 여부
     * 
     * @example
     * if (Validator.isDuplicateEmployeeNumber('20240001', employees)) {
     *     alert('이미 사용 중인 사원번호입니다');
     * }
     */
    isDuplicateEmployeeNumber(employeeNumber, employees, excludeId = null) {
        try {
            // 사원번호는 선택 항목이므로 비어있으면 중복 아님
            if (!employeeNumber) {
                로거_인사?.debug('사원번호 중복 검증: 빈 값');
                return false;
            }
            
            const isDuplicate = employees.some(emp => 
                emp.employeeNumber === employeeNumber && 
                emp.id !== excludeId &&
                emp.employeeNumber // 비어있지 않은 경우만
            );
            
            로거_인사?.debug('사원번호 중복 검증', { 
                employeeNumber, 
                excludeId, 
                isDuplicate 
            });
            
            return isDuplicate;
            
        } catch (error) {
            로거_인사?.error('사원번호 중복 검증 중 오류', error);
            return false;
        }
    },
    
    // ===== 주민등록번호 검증 =====
    
    /**
     * 주민등록번호 형식 검증 (000000-0000000)
     * 
     * @param {string} residentNumber - 주민등록번호
     * @returns {boolean} 유효성 여부
     * 
     * @example
     * Validator.isValidResidentNumber('901231-1234567'); // true
     * Validator.isValidResidentNumber('90123-1234567'); // false
     */
    isValidResidentNumber(residentNumber) {
        try {
            // 선택 항목이므로 비어있어도 OK
            if (!residentNumber) {
                로거_인사?.debug('주민등록번호 검증: 빈 값 (선택 항목)');
                return true;
            }
            
            const regex = /^\d{6}-\d{7}$/;
            const result = regex.test(residentNumber);
            
            로거_인사?.debug('주민등록번호 검증', { 
                residentNumber, 
                result 
            });
            
            return result;
            
        } catch (error) {
            로거_인사?.error('주민등록번호 검증 중 오류', error);
            return false;
        }
    },
    
    // ===== 종합 검증 함수 =====
    
    /**
     * 검증 결과를 사용자에게 표시
     * 
     * @param {Array<string>} errors - 에러 메시지 배열
     * @returns {boolean} 에러가 없으면 true
     * 
     * @example
     * const errors = ['성명을 입력해주세요', '입사일이 잘못되었습니다'];
     * Validator.showValidationErrors(errors);
     */
    showValidationErrors(errors) {
        try {
            if (errors.length === 0) {
                return true;
            }
            
            로거_인사?.warn('검증 실패', { errorCount: errors.length, errors });
            
            const errorMessage = '⚠️ 다음 항목을 확인해주세요:\n\n' + 
                errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
            
            // 에러처리_인사가 있으면 사용
            if (typeof 에러처리_인사 !== 'undefined') {
                에러처리_인사.warn(errorMessage);
            } else {
                alert(errorMessage);
            }
            
            return false;
            
        } catch (error) {
            로거_인사?.error('검증 에러 표시 중 오류', error);
            return false;
        }
    },
    
    /**
     * 검증 결과 객체 생성
     * 
     * @param {boolean} valid - 유효성 여부
     * @param {Array<string>} [errors=[]] - 에러 메시지 배열
     * @returns {Object} { valid: boolean, errors: Array<string> }
     * 
     * @example
     * const result = Validator.createValidationResult(false, ['오류 1', '오류 2']);
     */
    createValidationResult(valid, errors = []) {
        return { valid, errors };
    }
};

// ===== 전역 노출 =====

/**
 * 전역에서 사용 가능하도록 export
 * @global
 */
if (typeof window !== 'undefined') {
    window.Validator = Validator;
    로거_인사?.info('Validator 전역 등록 완료');
}
