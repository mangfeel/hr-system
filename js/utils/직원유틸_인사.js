/**
 * 직원유틸_인사.js
 * 
 * 직원 데이터 처리 유틸리티
 * - 중복 코드 제거 (10개 이상 파일에서 사용)
 * - 안전한 데이터 접근 (null 체크)
 * - 하위 호환성 100% (personalInfo / name 둘 다 지원)
 * - 호봉제 판단 및 계산
 * - 근속연수 계산
 * 
 * @version 4.0.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.0.0 (2026-01-21) ⭐ API 연동 버전
 *   - 서버 API 호출 버전 추가 (*Async 접미사)
 *   - getCurrentRankAsync, getNextUpgradeDateAsync 등
 *   - 기존 동기 함수 100% 유지 (하위 호환)
 *   - API_인사 모듈 연동
 * 
 * v3.1.0 (2025-12-03) ⭐ 기준일별 동적 호봉 계산 지원
 *   - getDynamicRankInfo() 함수 추가
 *   - 발령별 이전 경력 인정율 반영
 *   - 기준일에 따라 달라지는 호봉 동적 계산
 *   - InternalCareerCalculator 연동
 *   - _getStoredRankInfo() 헬퍼 함수 추가
 * 
 * v3.0.1 - Phase 3 긴급 버그 수정: isRankBased 로직 수정 (2025-11-11)
 *   🐛 치명적 버그 수정: 연봉제→호봉제 전환 시 화면에 반영 안되는 문제
 *   - isRankBased() 함수 로직 개선
 *   - Phase 3 이후: emp.rank.isRankBased 플래그만으로 판단
 *   - 연봉제 직원 (firstUpgradeDate = "-")도 호봉제 전환 가능
 *   - Phase 3 이전 데이터 (isRankBased 없음) 호환성 유지
 *   - firstUpgradeDate 체크는 구버전 데이터에만 적용
 * 
 * v3.0 - 프로덕션급 리팩토링: 직원 유틸리티 생성
 * 
 * [의존성]
 * - 로거_인사.js (로거_인사)
 * - 에러처리_인사.js (에러처리_인사)
 * - 호봉계산기_인사.js (RankCalculator, DateUtils, TenureCalculator) - 런타임에 체크
 * - 호봉계산기_인사.js (InternalCareerCalculator) - v3.1.0 동적 호봉 계산용
 * - API_인사.js (API_인사) - v4.0.0 서버 API 호출용
 * 
 * [사용 예시]
 * const name = 직원유틸_인사.getName(emp);
 * const isRankBased = 직원유틸_인사.isRankBased(emp);
 * const currentRank = 직원유틸_인사.getCurrentRank(emp, today);
 * const dynamicInfo = 직원유틸_인사.getDynamicRankInfo(emp, baseDate); // v3.1.0
 * 
 * // v4.0.0 API 버전 (async)
 * const currentRank = await 직원유틸_인사.getCurrentRankAsync(emp, today);
 * const dynamicInfo = await 직원유틸_인사.getDynamicRankInfoAsync(emp, baseDate);
 */

/**
 * 직원 데이터 처리 유틸리티
 * @namespace 직원유틸_인사
 */
const 직원유틸_인사 = (function() {
    
    // Public API
    return {
        /**
         * 직원 이름 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 직원 이름
         * 
         * @example
         * const name = 직원유틸_인사.getName(emp);
         */
        getName(emp) {
            if (!emp) return '이름 없음';
            
            // 신규 구조 우선
            if (emp.personalInfo && emp.personalInfo.name) {
                return emp.personalInfo.name;
            }
            
            // 구버전 하위 호환
            if (emp.name) {
                return emp.name;
            }
            
            return '이름 없음';
        },
        
        /**
         * 부서 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 부서명
         * 
         * @example
         * const dept = 직원유틸_인사.getDepartment(emp);
         */
        getDepartment(emp) {
            if (!emp) return '부서 미지정';
            
            // 신규 구조 우선
            if (emp.currentPosition && emp.currentPosition.dept) {
                return emp.currentPosition.dept;
            }
            
            // 구버전 하위 호환
            if (emp.dept) {
                return emp.dept;
            }
            
            return '부서 미지정';
        },
        
        /**
         * 직위 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 직위
         * 
         * @example
         * const position = 직원유틸_인사.getPosition(emp);
         */
        getPosition(emp) {
            if (!emp) return '직위 미지정';
            
            // 신규 구조 우선
            if (emp.currentPosition && emp.currentPosition.position) {
                return emp.currentPosition.position;
            }
            
            // 구버전 하위 호환
            if (emp.position) {
                return emp.position;
            }
            
            return '직위 미지정';
        },
        
        /**
         * 직급 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 직급
         * 
         * @example
         * const grade = 직원유틸_인사.getGrade(emp);
         */
        getGrade(emp) {
            if (!emp) return '-';
            
            // 신규 구조 우선
            if (emp.currentPosition && emp.currentPosition.grade) {
                return emp.currentPosition.grade;
            }
            
            // 구버전 하위 호환
            if (emp.grade) {
                return emp.grade;
            }
            
            return '-';
        },
        
        /**
         * 직종 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 직종
         * 
         * @example
         * const jobType = 직원유틸_인사.getJobType(emp);
         */
        getJobType(emp) {
            if (!emp) return '-';
            
            // 신규 구조 우선
            if (emp.currentPosition && emp.currentPosition.jobType) {
                return emp.currentPosition.jobType;
            }
            
            // 구버전 하위 호환
            if (emp.jobType) {
                return emp.jobType;
            }
            
            return '-';
        },
        
        /**
         * 입사일 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 입사일 (YYYY-MM-DD)
         * 
         * @example
         * const entryDate = 직원유틸_인사.getEntryDate(emp);
         */
        getEntryDate(emp) {
            if (!emp) return '-';
            
            // 신규 구조 우선
            if (emp.employment && emp.employment.entryDate) {
                return emp.employment.entryDate;
            }
            
            // 구버전 하위 호환
            if (emp.entryDate) {
                return emp.entryDate;
            }
            
            return '-';
        },
        
        /**
         * 퇴사일 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string|null} 퇴사일 (YYYY-MM-DD) 또는 null
         * 
         * @example
         * const retireDate = 직원유틸_인사.getRetirementDate(emp);
         */
        getRetirementDate(emp) {
            if (!emp) return null;
            
            // 신규 구조 우선
            if (emp.employment && emp.employment.retirementDate) {
                return emp.employment.retirementDate;
            }
            
            // 구버전 하위 호환
            if (emp.retirementDate) {
                return emp.retirementDate;
            }
            
            return null;
        },
        
        /**
         * 고용 형태 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 고용 형태 (정규직/계약직/파트타임)
         * 
         * @example
         * const type = 직원유틸_인사.getEmploymentType(emp);
         */
        getEmploymentType(emp) {
            if (!emp) return '정규직';
            
            // 신규 구조 우선
            if (emp.employment && emp.employment.type) {
                return emp.employment.type;
            }
            
            // 구버전 하위 호환
            if (emp.employmentType) {
                return emp.employmentType;
            }
            
            return '정규직';
        },
        
        /**
         * 재직 상태 가져오기 (하위 호환)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 재직 상태 (재직/퇴사)
         * 
         * @example
         * const status = 직원유틸_인사.getEmploymentStatus(emp);
         */
        getEmploymentStatus(emp) {
            if (!emp) return '재직';
            
            // 신규 구조 우선
            if (emp.employment && emp.employment.status) {
                return emp.employment.status;
            }
            
            // 퇴사일이 있으면 퇴사
            const retirementDate = this.getRetirementDate(emp);
            if (retirementDate) {
                return '퇴사';
            }
            
            return '재직';
        },
        
        /**
         * 재직 중인지 확인
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 재직 여부
         * 
         * @example
         * if (직원유틸_인사.isActive(emp)) {
         *     // 재직자 처리
         * }
         */
        isActive(emp) {
            return this.getEmploymentStatus(emp) === '재직';
        },
        
        /**
         * 퇴사자인지 확인
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 퇴사 여부
         * 
         * @example
         * if (직원유틸_인사.isRetired(emp)) {
         *     // 퇴사자 처리
         * }
         */
        isRetired(emp) {
            return this.getEmploymentStatus(emp) === '퇴사';
        },
        
        /**
         * 유효한 첫 승급일이 있는지 확인
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 유효성 여부
         * 
         * @example
         * if (직원유틸_인사.hasValidFirstUpgradeDate(emp)) {
         *     // 호봉 계산 가능
         * }
         */
        hasValidFirstUpgradeDate(emp) {
            if (!emp || !emp.rank || !emp.rank.firstUpgradeDate) {
                return false;
            }
            
            const date = emp.rank.firstUpgradeDate;
            
            // 무효한 값들
            const invalidValues = ['', null, 'null', '-', undefined];
            
            return !invalidValues.includes(date);
        },
        
        /**
         * 호봉제 적용 여부 확인
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 호봉제 적용 여부
         * 
         * @description
         * Phase 3 이후: emp.rank.isRankBased 플래그가 명시적으로 관리됨
         * - 연봉제 직원도 경력 추적을 위해 호봉 계산은 하지만
         * - 급여 지급은 연봉제로 함 (isRankBased = false)
         * - firstUpgradeDate가 없어도 isRankBased 플래그만으로 판단 가능
         * 
         * @example
         * if (직원유틸_인사.isRankBased(emp)) {
         *     const rank = 직원유틸_인사.getCurrentRank(emp);
         * }
         */
        isRankBased(emp) {
            if (!emp || !emp.rank) {
                return false;
            }
            
            // ⭐ 급여유형이 '연봉제'면 무조건 false
            // salaryType이 명시적으로 '연봉제'로 설정된 경우 호봉제가 아님
            if (emp.rank.salaryType === '연봉제') {
                return false;
            }
            
            // ⭐ Phase 3 이후: isRankBased 플래그가 명시적으로 설정되므로 이것만 확인
            // 연봉제 직원 (경력 없음, firstUpgradeDate = "-")도 호봉제로 전환 가능
            // 호봉제 → 연봉제 전환 시 isRankBased = false로 명시적 설정
            if (emp.rank.isRankBased === false) {
                return false;
            }
            
            // ⭐ Phase 3 이전 데이터 (isRankBased 플래그 없음) 호환성 유지
            // isRankBased가 명시적으로 설정되지 않은 경우에만 firstUpgradeDate 체크
            if (emp.rank.isRankBased === undefined || emp.rank.isRankBased === null) {
                // 구버전 데이터: firstUpgradeDate로 판단
                return this.hasValidFirstUpgradeDate(emp);
            }
            
            // ⭐ Phase 3 이후: isRankBased = true이면 무조건 호봉제
            // (firstUpgradeDate가 "-"여도 호봉제로 인정)
            return true;
        },
        
        /**
         * 시작 호봉 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {number|string} 시작 호봉 또는 '-'
         * 
         * @example
         * const startRank = 직원유틸_인사.getStartRank(emp);
         */
        getStartRank(emp) {
            if (!emp || !emp.rank) {
                return '-';
            }
            
            if (emp.rank.startRank !== undefined && emp.rank.startRank !== null) {
                return emp.rank.startRank;
            }
            
            return '-';
        },
        
        /**
         * 첫 승급일 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 첫 승급일 (YYYY-MM-DD) 또는 '-'
         * 
         * @example
         * const firstDate = 직원유틸_인사.getFirstUpgradeDate(emp);
         */
        getFirstUpgradeDate(emp) {
            if (!emp || !emp.rank || !emp.rank.firstUpgradeDate) {
                return '-';
            }
            
            return emp.rank.firstUpgradeDate;
        },
        
        /**
         * 현재 호봉 계산
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일 (YYYY-MM-DD, null이면 오늘)
         * @returns {number|string} 현재 호봉 또는 '-'
         * 
         * @example
         * const currentRank = 직원유틸_인사.getCurrentRank(emp);
         * const rankAtDate = 직원유틸_인사.getCurrentRank(emp, '2024-12-31');
         */
        getCurrentRank(emp, baseDate = null) {
            // 호봉제가 아니면 '-'
            if (!this.isRankBased(emp)) {
                return '-';
            }
            
            try {
                // RankCalculator 존재 여부 확인
                if (typeof RankCalculator === 'undefined') {
                    if (typeof 로거_인사 !== 'undefined') {
                        로거_인사.warn('RankCalculator를 찾을 수 없습니다');
                    }
                    return emp.rank.startRank || '-';
                }
                
                // DateUtils 존재 여부 확인
                if (typeof DateUtils === 'undefined') {
                    if (typeof 로거_인사 !== 'undefined') {
                        로거_인사.warn('DateUtils를 찾을 수 없습니다');
                    }
                    return emp.rank.startRank || '-';
                }
                
                // 기준일 결정
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                
                // 호봉 계산
                const currentRank = RankCalculator.calculateCurrentRank(
                    emp.rank.startRank,
                    emp.rank.firstUpgradeDate,
                    targetDate
                );
                
                return currentRank;
                
            } catch (error) {
                // 에러 로깅
                if (typeof 로거_인사 !== 'undefined') {
                    로거_인사.error('호봉 계산 오류', {
                        employee: this.getName(emp),
                        uniqueCode: emp.uniqueCode,
                        error: error.message
                    });
                }
                
                // 계산 실패 시 시작 호봉 반환
                return emp.rank.startRank || '-';
            }
        },
        
        /**
         * ⭐ v4.0.0: 현재 호봉 계산 (API 버전)
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일
         * @returns {Promise<number|string>} 현재 호봉 또는 '-'
         */
        async getCurrentRankAsync(emp, baseDate = null) {
            if (!this.isRankBased(emp)) {
                return '-';
            }
            
            try {
                if (typeof API_인사 !== 'undefined') {
                    const targetDate = baseDate || DateUtils.formatDate(new Date());
                    const result = await API_인사.calculateCurrentRank(
                        emp.rank.startRank,
                        emp.rank.firstUpgradeDate,
                        targetDate
                    );
                    return result;
                }
                // API 없으면 로컬 계산
                return this.getCurrentRank(emp, baseDate);
            } catch (error) {
                console.error('getCurrentRankAsync 오류', error);
                return this.getCurrentRank(emp, baseDate);
            }
        },
        
        /**
         * 다음 승급일 계산
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일 (YYYY-MM-DD, null이면 오늘)
         * @returns {string} 다음 승급일 (YYYY-MM-DD) 또는 '-'
         * 
         * @example
         * const nextDate = 직원유틸_인사.getNextUpgradeDate(emp);
         */
        getNextUpgradeDate(emp, baseDate = null) {
            // 호봉제가 아니면 '-'
            if (!this.isRankBased(emp)) {
                return '-';
            }
            
            try {
                // RankCalculator 존재 여부 확인
                if (typeof RankCalculator === 'undefined') {
                    return '-';
                }
                
                // DateUtils 존재 여부 확인
                if (typeof DateUtils === 'undefined') {
                    return '-';
                }
                
                // 기준일 결정
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                
                // 다음 승급일 계산
                const nextDate = RankCalculator.calculateNextUpgradeDate(
                    emp.rank.firstUpgradeDate,
                    targetDate
                );
                
                return nextDate;
                
            } catch (error) {
                if (typeof 로거_인사 !== 'undefined') {
                    로거_인사.error('다음 승급일 계산 오류', {
                        employee: this.getName(emp),
                        error: error.message
                    });
                }
                return '-';
            }
        },
        
        /**
         * ⭐ v4.0.0: 다음 승급일 계산 (API 버전)
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일
         * @returns {Promise<string>} 다음 승급일 (YYYY-MM-DD) 또는 '-'
         */
        async getNextUpgradeDateAsync(emp, baseDate = null) {
            if (!this.isRankBased(emp)) {
                return '-';
            }
            
            try {
                if (typeof API_인사 !== 'undefined') {
                    const targetDate = baseDate || DateUtils.formatDate(new Date());
                    const result = await API_인사.calculateNextUpgradeDate(
                        emp.rank.firstUpgradeDate,
                        targetDate
                    );
                    return result;
                }
                return this.getNextUpgradeDate(emp, baseDate);
            } catch (error) {
                console.error('getNextUpgradeDateAsync 오류', error);
                return this.getNextUpgradeDate(emp, baseDate);
            }
        },
        
        /**
         * ⭐ v3.1.0: 동적 호봉 정보 계산 (기준일별 인정율 반영)
         * 
         * 발령별 이전 경력 인정율이 설정된 경우, 기준일에 따라 호봉이 달라질 수 있음.
         * 이 함수는 기준일 시점의 유효한 인정율을 반영하여 호봉 정보를 동적으로 계산.
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일 (YYYY-MM-DD, null이면 오늘)
         * @returns {Object} { startRank, firstUpgradeDate, currentRank, nextUpgradeDate, adjusted }
         * 
         * @example
         * const info = 직원유틸_인사.getDynamicRankInfo(emp, '2025-03-01');
         * // { startRank: 2, firstUpgradeDate: '2025-04-01', currentRank: 2, nextUpgradeDate: '2025-04-01', adjusted: true }
         * 
         * @version 3.1.0
         */
        getDynamicRankInfo(emp, baseDate = null) {
            // 호봉제가 아니면 기본값 반환
            if (!this.isRankBased(emp)) {
                return {
                    startRank: '-',
                    firstUpgradeDate: '-',
                    currentRank: '-',
                    nextUpgradeDate: '-',
                    adjusted: false
                };
            }
            
            try {
                // 필수 모듈 확인
                if (typeof RankCalculator === 'undefined' || 
                    typeof DateUtils === 'undefined' ||
                    typeof TenureCalculator === 'undefined') {
                    // 모듈 없으면 저장된 값 사용
                    return this._getStoredRankInfo(emp, baseDate);
                }
                
                // 기준일 결정
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                const entryDate = this.getEntryDate(emp);
                
                if (entryDate === '-') {
                    return this._getStoredRankInfo(emp, baseDate);
                }
                
                // InternalCareerCalculator 없으면 저장된 값 사용
                if (typeof InternalCareerCalculator === 'undefined') {
                    return this._getStoredRankInfo(emp, baseDate);
                }
                
                // 인정율 적용된 현 기관 경력 계산
                const internalResult = InternalCareerCalculator.calculateWithPriorCareerRate(emp, targetDate);
                
                // 모든 발령이 100% 인정율인지 확인
                const allFullRate = internalResult.details.every(d => d.rate === 100);
                
                // 모든 발령이 100%면 저장된 값 사용 (계산 오차 방지)
                if (allFullRate) {
                    return this._getStoredRankInfo(emp, baseDate);
                }
                
                // ⭐ 동적 계산 필요 (100% 미만 인정율 존재)
                
                // 1. 원본 재직일수
                const originalPeriod = TenureCalculator.calculate(entryDate, targetDate);
                const originalDays = originalPeriod.years * 365 + originalPeriod.months * 30 + originalPeriod.days;
                
                // 2. 손실 일수
                const lostDays = originalDays - internalResult.totalDays;
                
                // 3. 조정된 입사일
                let adjustedEntryDate = entryDate;
                if (lostDays > 0) {
                    adjustedEntryDate = DateUtils.addDays(entryDate, lostDays);
                }
                
                // 4. 과거 경력 (타 기관) 합산
                const pastCareers = emp.careerDetails || [];
                let totalPastYears = 0;
                let totalPastMonths = 0;
                let totalPastDays = 0;
                
                pastCareers.forEach(career => {
                    const converted = career.converted || career.period || '';
                    const match = converted.match(/(\d+)년\s*(\d+)개월\s*(\d+)일/);
                    if (match) {
                        totalPastYears += parseInt(match[1]) || 0;
                        totalPastMonths += parseInt(match[2]) || 0;
                        totalPastDays += parseInt(match[3]) || 0;
                    }
                });
                
                // 정규화
                totalPastMonths += Math.floor(totalPastDays / 30);
                totalPastDays = totalPastDays % 30;
                totalPastYears += Math.floor(totalPastMonths / 12);
                totalPastMonths = totalPastMonths % 12;
                
                // 5. 입사호봉 = 1 + 과거경력년수
                const startRank = 1 + totalPastYears;
                
                // 6. 동적 첫승급일 계산
                const dynamicFirstUpgrade = RankCalculator.calculateFirstUpgradeDate(
                    adjustedEntryDate,
                    totalPastYears,
                    totalPastMonths,
                    totalPastDays
                );
                
                // 7. 현재 호봉 계산
                const currentRank = RankCalculator.calculateCurrentRank(startRank, dynamicFirstUpgrade, targetDate);
                
                // 8. 차기승급일
                const nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(dynamicFirstUpgrade, targetDate);
                
                return {
                    startRank: startRank,
                    firstUpgradeDate: dynamicFirstUpgrade,
                    currentRank: currentRank,
                    nextUpgradeDate: nextUpgradeDate,
                    adjusted: true,  // 동적 계산됨
                    lostDays: lostDays,
                    adjustedEntryDate: adjustedEntryDate
                };
                
            } catch (error) {
                if (typeof 로거_인사 !== 'undefined') {
                    로거_인사.error('동적 호봉 계산 오류', {
                        employee: this.getName(emp),
                        error: error.message
                    });
                }
                // 오류 시 저장된 값 반환
                return this._getStoredRankInfo(emp, baseDate);
            }
        },
        
        /**
         * ⭐ v4.0.0: 동적 호봉 정보 계산 - API 버전
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일
         * @returns {Promise<Object>} 호봉 정보
         */
        async getDynamicRankInfoAsync(emp, baseDate = null) {
            if (!this.isRankBased(emp)) {
                return {
                    startRank: '-',
                    firstUpgradeDate: '-',
                    currentRank: '-',
                    nextUpgradeDate: '-',
                    adjusted: false
                };
            }
            
            try {
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                const entryDate = this.getEntryDate(emp);
                
                if (entryDate === '-') {
                    return await this._getStoredRankInfoAsync(emp, baseDate);
                }
                
                // InternalCareerCalculator로 인정율 적용 경력 계산
                if (typeof InternalCareerCalculator === 'undefined') {
                    return await this._getStoredRankInfoAsync(emp, baseDate);
                }
                
                const internalResult = InternalCareerCalculator.calculateWithPriorCareerRate(emp, targetDate);
                const allFullRate = internalResult.details.every(d => d.rate === 100);
                
                if (allFullRate) {
                    return await this._getStoredRankInfoAsync(emp, baseDate);
                }
                
                // 동적 계산 필요
                let originalPeriod;
                if (typeof API_인사 !== 'undefined') {
                    originalPeriod = await API_인사.calculateTenure(entryDate, targetDate);
                } else {
                    originalPeriod = TenureCalculator.calculate(entryDate, targetDate);
                }
                
                const originalDays = originalPeriod.years * 365 + originalPeriod.months * 30 + originalPeriod.days;
                const lostDays = originalDays - internalResult.totalDays;
                
                let adjustedEntryDate = entryDate;
                if (lostDays > 0) {
                    adjustedEntryDate = DateUtils.addDays(entryDate, lostDays);
                }
                
                // 과거 경력 합산
                const pastCareers = emp.careerDetails || [];
                let totalPastYears = 0, totalPastMonths = 0, totalPastDays = 0;
                
                pastCareers.forEach(career => {
                    const converted = career.converted || career.period || '';
                    const match = converted.match(/(\d+)년\s*(\d+)개월\s*(\d+)일/);
                    if (match) {
                        totalPastYears += parseInt(match[1]) || 0;
                        totalPastMonths += parseInt(match[2]) || 0;
                        totalPastDays += parseInt(match[3]) || 0;
                    }
                });
                
                totalPastMonths += Math.floor(totalPastDays / 30);
                totalPastDays = totalPastDays % 30;
                totalPastYears += Math.floor(totalPastMonths / 12);
                totalPastMonths = totalPastMonths % 12;
                
                const startRank = 1 + totalPastYears;
                
                // API 호출
                let dynamicFirstUpgrade, currentRank, nextUpgradeDate;
                
                if (typeof API_인사 !== 'undefined') {
                    dynamicFirstUpgrade = await API_인사.calculateFirstUpgradeDate(
                        adjustedEntryDate, totalPastYears, totalPastMonths, totalPastDays
                    );
                    currentRank = await API_인사.calculateCurrentRank(startRank, dynamicFirstUpgrade, targetDate);
                    nextUpgradeDate = await API_인사.calculateNextUpgradeDate(dynamicFirstUpgrade, targetDate);
                } else {
                    dynamicFirstUpgrade = RankCalculator.calculateFirstUpgradeDate(
                        adjustedEntryDate, totalPastYears, totalPastMonths, totalPastDays
                    );
                    currentRank = RankCalculator.calculateCurrentRank(startRank, dynamicFirstUpgrade, targetDate);
                    nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(dynamicFirstUpgrade, targetDate);
                }
                
                return {
                    startRank,
                    firstUpgradeDate: dynamicFirstUpgrade,
                    currentRank,
                    nextUpgradeDate,
                    adjusted: true,
                    lostDays,
                    adjustedEntryDate
                };
                
            } catch (error) {
                console.error('getDynamicRankInfoAsync 오류', error);
                return this._getStoredRankInfo(emp, baseDate);
            }
        },
        
        /**
         * 저장된 호봉 정보 반환 (Private)
         * 
         * @private
         * @param {Object} emp - 직원 객체
         * @param {string|null} baseDate - 기준일
         * @returns {Object} 호봉 정보
         */
        _getStoredRankInfo(emp, baseDate = null) {
            try {
                const targetDate = baseDate || (typeof DateUtils !== 'undefined' ? DateUtils.formatDate(new Date()) : new Date().toISOString().split('T')[0]);
                const startRank = emp.rank?.startRank || 1;
                const firstUpgradeDate = emp.rank?.firstUpgradeDate || '-';
                
                let currentRank = startRank;
                let nextUpgradeDate = '-';
                
                if (firstUpgradeDate !== '-' && typeof RankCalculator !== 'undefined') {
                    currentRank = RankCalculator.calculateCurrentRank(startRank, firstUpgradeDate, targetDate);
                    nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(firstUpgradeDate, targetDate);
                }
                
                return {
                    startRank: startRank,
                    firstUpgradeDate: firstUpgradeDate,
                    currentRank: currentRank,
                    nextUpgradeDate: nextUpgradeDate,
                    adjusted: false  // 저장된 값 사용
                };
            } catch (error) {
                return {
                    startRank: emp.rank?.startRank || '-',
                    firstUpgradeDate: emp.rank?.firstUpgradeDate || '-',
                    currentRank: emp.rank?.currentRank || '-',
                    nextUpgradeDate: emp.rank?.nextUpgradeDate || '-',
                    adjusted: false
                };
            }
        },
        
        /**
         * ⭐ v4.0.0: 저장된 호봉 정보 반환 - API 버전 (Private)
         * @private
         */
        async _getStoredRankInfoAsync(emp, baseDate = null) {
            try {
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                const startRank = emp.rank?.startRank || 1;
                const firstUpgradeDate = emp.rank?.firstUpgradeDate || '-';
                
                let currentRank = startRank;
                let nextUpgradeDate = '-';
                
                if (firstUpgradeDate !== '-') {
                    if (typeof API_인사 !== 'undefined') {
                        currentRank = await API_인사.calculateCurrentRank(startRank, firstUpgradeDate, targetDate);
                        nextUpgradeDate = await API_인사.calculateNextUpgradeDate(firstUpgradeDate, targetDate);
                    } else if (typeof RankCalculator !== 'undefined') {
                        currentRank = RankCalculator.calculateCurrentRank(startRank, firstUpgradeDate, targetDate);
                        nextUpgradeDate = RankCalculator.calculateNextUpgradeDate(firstUpgradeDate, targetDate);
                    }
                }
                
                return {
                    startRank,
                    firstUpgradeDate,
                    currentRank,
                    nextUpgradeDate,
                    adjusted: false
                };
            } catch (error) {
                return {
                    startRank: emp.rank?.startRank || '-',
                    firstUpgradeDate: emp.rank?.firstUpgradeDate || '-',
                    currentRank: emp.rank?.currentRank || '-',
                    nextUpgradeDate: emp.rank?.nextUpgradeDate || '-',
                    adjusted: false
                };
            }
        },
        
        /**
         * 근속연수 계산
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일 (YYYY-MM-DD, null이면 오늘)
         * @returns {Object|null} { years: number, formatted: string } 또는 null
         * 
         * @example
         * const tenure = 직원유틸_인사.getTenure(emp);
         * // { years: 5.5, formatted: '5년 6개월' }
         */
        getTenure(emp, baseDate = null) {
            const entryDate = this.getEntryDate(emp);
            if (entryDate === '-') {
                return null;
            }
            
            try {
                // TenureCalculator 존재 여부 확인
                if (typeof TenureCalculator === 'undefined') {
                    return null;
                }
                
                // DateUtils 존재 여부 확인
                if (typeof DateUtils === 'undefined') {
                    return null;
                }
                
                // 기준일 결정
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                
                // 근속연수 계산
                const years = TenureCalculator.calculate(entryDate, targetDate);
                const formatted = TenureCalculator.format(years);
                
                return {
                    years: years,
                    formatted: formatted
                };
                
            } catch (error) {
                if (typeof 로거_인사 !== 'undefined') {
                    로거_인사.error('근속연수 계산 오류', {
                        employee: this.getName(emp),
                        error: error.message
                    });
                }
                return null;
            }
        },
        
        /**
         * ⭐ v4.0.0: 근속연수 계산 - API 버전
         * 
         * @param {Object} emp - 직원 객체
         * @param {string|null} [baseDate=null] - 기준일
         * @returns {Promise<Object|null>} { years, formatted } 또는 null
         */
        async getTenureAsync(emp, baseDate = null) {
            const entryDate = this.getEntryDate(emp);
            if (entryDate === '-') {
                return null;
            }
            
            try {
                const targetDate = baseDate || DateUtils.formatDate(new Date());
                
                let years;
                if (typeof API_인사 !== 'undefined') {
                    years = await API_인사.calculateTenure(entryDate, targetDate);
                } else {
                    years = TenureCalculator.calculate(entryDate, targetDate);
                }
                
                const formatted = TenureCalculator.format(years);
                
                return { years, formatted };
                
            } catch (error) {
                console.error('getTenureAsync 오류', error);
                return this.getTenure(emp, baseDate);
            }
        },
        
        /**
         * 육아휴직 중인지 확인
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 육아휴직 여부
         * 
         * @example
         * if (직원유틸_인사.isOnMaternityLeave(emp)) {
         *     // 육아휴직 중 처리
         * }
         */
        isOnMaternityLeave(emp) {
            if (!emp || !emp.maternityLeave) {
                return false;
            }
            
            return emp.maternityLeave.isOnLeave === true;
        },
        
        /**
         * 직원 요약 정보 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {Object} 요약 정보
         * 
         * @example
         * const summary = 직원유틸_인사.getSummary(emp);
         * // { name: '홍길동', uniqueCode: 'H001', department: '개발팀', ... }
         */
        getSummary(emp) {
            return {
                name: this.getName(emp),
                uniqueCode: emp ? emp.uniqueCode : '-',
                department: this.getDepartment(emp),
                position: this.getPosition(emp),
                grade: this.getGrade(emp),
                entryDate: this.getEntryDate(emp),
                isActive: this.isActive(emp),
                isRankBased: this.isRankBased(emp),
                currentRank: this.isRankBased(emp) ? this.getCurrentRank(emp) : '-',
                isOnMaternityLeave: this.isOnMaternityLeave(emp)
            };
        },
        
        /**
         * 표시용 이름 (부서 + 직위 포함)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 표시용 이름
         * 
         * @example
         * const displayName = 직원유틸_인사.getDisplayName(emp);
         * // "홍길동 (개발팀 과장)"
         */
        getDisplayName(emp) {
            const name = this.getName(emp);
            const dept = this.getDepartment(emp);
            const position = this.getPosition(emp);
            
            return `${name} (${dept} ${position})`;
        },
        
        /**
         * 직원 정보 텍스트 생성 (상세)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {string} 상세 정보 텍스트
         * 
         * @example
         * const info = 직원유틸_인사.getInfoText(emp);
         */
        getInfoText(emp) {
            const summary = this.getSummary(emp);
            
            let text = `이름: ${summary.name}\n`;
            text += `고유번호: ${summary.uniqueCode}\n`;
            text += `부서: ${summary.department}\n`;
            text += `직위: ${summary.position}\n`;
            text += `직급: ${summary.grade}\n`;
            text += `입사일: ${summary.entryDate}\n`;
            text += `재직 상태: ${summary.isActive ? '재직' : '퇴사'}\n`;
            
            if (summary.isRankBased) {
                text += `현재 호봉: ${summary.currentRank}호봉\n`;
            }
            
            if (summary.isOnMaternityLeave) {
                text += `육아휴직: 휴직 중\n`;
            }
            
            return text;
        },
        
        /**
         * 직원 데이터 유효성 검증 (기본)
         * 
         * @param {Object} emp - 직원 객체
         * @returns {boolean} 유효성 여부
         * 
         * @example
         * if (직원유틸_인사.isValidEmployee(emp)) {
         *     // 유효한 직원
         * }
         */
        isValidEmployee(emp) {
            if (!emp) return false;
            if (!emp.id) return false;
            if (!emp.uniqueCode) return false;
            
            const name = this.getName(emp);
            if (name === '이름 없음') return false;
            
            const entryDate = this.getEntryDate(emp);
            if (entryDate === '-') return false;
            
            return true;
        },
        
        /**
         * 경력 정보 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {Array} 경력 배열
         * 
         * @example
         * const careers = 직원유틸_인사.getCareers(emp);
         */
        getCareers(emp) {
            if (!emp || !emp.careers) {
                return [];
            }
            
            return emp.careers;
        },
        
        /**
         * 인사발령 이력 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {Array} 인사발령 배열
         * 
         * @example
         * const assignments = 직원유틸_인사.getAssignments(emp);
         */
        getAssignments(emp) {
            if (!emp || !emp.assignments) {
                return [];
            }
            
            return emp.assignments;
        },
        
        /**
         * 육아휴직 이력 가져오기
         * 
         * @param {Object} emp - 직원 객체
         * @returns {Array} 육아휴직 배열
         * 
         * @example
         * const history = 직원유틸_인사.getMaternityHistory(emp);
         */
        getMaternityHistory(emp) {
            if (!emp || !emp.maternityLeave || !emp.maternityLeave.history) {
                return [];
            }
            
            return emp.maternityLeave.history;
        }
    };
})();

/**
 * 전역 별칭 (편의성)
 * @const {Object} EmployeeUtils
 */
const EmployeeUtils = 직원유틸_인사;

// 초기화 로그
console.log('✅ 직원유틸_인사.js 로드 완료 (v4.0.0 API 연동 버전)');
