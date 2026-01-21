/**
 * 급여계산기_인사.js - 급여 계산 엔진
 * 
 * 급여 계산 핵심 로직
 * - 특정 날짜 기준 발령 조회
 * - 기본급 조회 (직급 + 호봉)
 * - 직책수당 조회 (직위) - 중도입사자 월할 계산
 * - 명절휴가비 계산 - 설/추석 당일 월의 호봉 기준 또는 월별 연동
 * - 직무대리 직책수당 계산
 * - 통상임금 계산 - 포함 항목 설정 반영
 * - 시급 계산 - 절사 방식 설정 반영
 * - 월소정근로시간 계산 - 소수점 처리 방식 설정 반영
 * 
 * @version 4.0.0
 * @since 2025-12-02
 * @location js/labor/급여계산기_인사.js
 * 
 * [변경 이력]
 * v4.0.0 (2026-01-21) ⭐ API 연동 버전
 *   - getRankAtDate() API 우선 사용
 *   - 관련 함수들 async/await 전환
 *   - 서버 API로 호봉 계산 로직 보호
 * 
 * v3.3.0 - 배율 적용 시급 계산 함수 추가 (2026-01-07)
 *   - getRatedHourlyWage(): 배율 적용된 시급 계산
 *   - applyTiming 설정에 따라 절사 시점 결정
 *   - 'after' (기본값): 원시급 × 배율 → 절사
 *   - 'before': 원시급 → 절사 → × 배율
 * v2.4.0 - 명절휴가비 월별 연동 방식 지원 (2025-12-12)
 *   - holidayBonusMethod 설정 반영 ('monthly' | 'annual')
 *   - 월별 연동: 현재 월 기본급 기준으로 명절휴가비 계산
 *   - 연간 고정: 설/추석 당일 호봉 기준으로 계산 (기존 방식)
 *   - getHolidayBonusForOrdinary(): currentBaseSalary 파라미터 추가
 * v2.3.0 - 시급 절사 방식 설정 추가 (2025-12-08)
 *   - hourlyWageRounding 설정 반영 (소수점 유지 / 정수 처리)
 *   - getHourlyWageRoundingSettings(): 시급 절사 방식 설정 로드
 *   - applyHourlyWageRounding(): 시급에 절사 방식 적용
 *   - getHourlyWage(): 설정에 따른 절사 적용
 *   - getHourlyWageRaw(): 내부 계산용 (항상 소수점 유지)
 *   - getHourlyWageDisplay(): 설정 반영 후 정수 표시
 * v2.2.0 - 시급 계산 소수점 유지 (2025-12-05)
 *   - getHourlyWage(): Math.floor() 제거, 소수점 유지
 *   - getHourlyWageDisplay(): 화면 표시용 함수 추가 (정수 버림)
 *   - 시간외수당 계산 시 정확도 향상
 *   - 최종 지급액 계산 시에만 반올림/올림/버림 적용
 * v2.1.0 - 월소정근로시간 소수점 처리 설정 (2025-12-05)
 *   - getMonthlyWorkingHours()에 연도 파라미터 추가
 *   - 급여설정의 monthlyHoursRounding 값 참조 (올림/반올림/버림)
 *   - getMonthlyHoursRoundingMethod(), applyRounding() 메서드 추가
 *   - 기본값: 반올림 (고용노동부 예시 기준)
 * v2.0.2 - 연봉제 기본급 계산 수정 (2025-12-02)
 *   - 연봉제 baseSalary는 월 기본급이므로 /12 제거
 * v2.0.1 - db 호환성 개선 (2025-12-02)
 *   - db.getById → db.findEmployee 호환
 *   - db.getAll → db.data.employees 호환
 *   - emp.personal → emp.personalInfo 호환
 * v2.0.0 - 통상임금 계산 전면 개선 (2025-12-02)
 *   - 명절휴가비: 설/추석 당일 월의 호봉 기준으로 각각 계산
 *   - 직책수당: 중도입사자 월할 계산 (실제 근무 개월수/12)
 *   - 직무대리: 해당 월 기간 존재 시 전액 포함
 *   - 통상임금 설정(hr_ordinary_wage_settings) 포함 항목 반영
 *   - 월별 시간급 계산 기능 추가
 * v1.1.0 - 연봉제 정액 명절휴가비 설/추석 분리 (2025-12-02)
 * v1.0.0 - 최초 생성
 * 
 * [계산 공식]
 * - 통상임금 = 기본급 + 직책수당(월할) + (명절휴가비 ÷ 12) + 직무대리직책수당
 * - 시급 = 통상임금 ÷ 월소정근로시간 (설정에 따라 절사)
 * - 명절휴가비 = (설 당일 월 기본급 × 비율) + (추석 당일 월 기본급 × 비율)
 * - 월소정근로시간 = (주근무시간 + 주휴시간) × (365÷12÷7)
 * 
 * [법적 근거]
 * - 대법원 2020다247190: 명절휴가비 통상임금 산입 (1년 만근 가정)
 * - 근로기준법 시행령 제6조: 월소정근로시간 계산
 * - 노동부 지침(25.2.6.): 통상시급 계산 원리
 * - 고용노동부 질의답변: 소수점 처리는 노사합의, 근로자 불이익 금지 원칙
 * 
 * [데이터 의존성]
 * - hr_salary_grades: 직급 목록
 * - hr_salary_tables: 급여표 (연도별)
 * - hr_position_allowances: 직책수당 (연도별)
 * - hr_salary_settings: 급여 설정 (명절휴가비 비율/날짜 등)
 * - hr_ordinary_wage_settings: 통상임금 설정 (포함 항목, 소수점 처리 방식, 시급 절사 방식)
 * - hr_concurrent_positions: 겸직/직무대리 정보
 */

// ===== 상수 정의 =====

const DEFAULT_WEEKLY_HOURS = 40;
const WEEKLY_HOURS_WITH_PAID_LEAVE = 48;
const WEEKS_PER_YEAR = 365 / 7;
const WEEKS_PER_MONTH = WEEKS_PER_YEAR / 12;

// ===== 급여 계산기 =====

const SalaryCalculator = {
    
    // ===== 발령 조회 =====
    
    getAssignmentAtDate(emp, targetDate) {
        try {
            if (!emp || !targetDate) return null;
            
            const retirementDate = emp.employment?.retirementDate;
            if (retirementDate && retirementDate < targetDate) return null;
            
            const assignments = emp.assignments || [];
            if (assignments.length === 0) return null;
            
            const sorted = [...assignments].sort((a, b) => {
                const dateA = a.startDate || a.date || '';
                const dateB = b.startDate || b.date || '';
                return dateB.localeCompare(dateA);
            });
            
            for (const assign of sorted) {
                const startDate = assign.startDate || assign.date;
                if (startDate && startDate <= targetDate) {
                    return assign;
                }
            }
            
            return null;
        } catch (error) {
            로거_인사?.error('getAssignmentAtDate 오류', error);
            return null;
        }
    },
    
    // ===== 기본급 조회 =====
    
    getBaseSalary(year, grade, rank, isRankBased = true) {
        try {
            const yearTable = SalarySettingsManager.getSalaryTableByYear(year);
            
            if (isRankBased) {
                const gradeData = yearTable.rank?.[grade];
                if (!gradeData) {
                    로거_인사?.warn('getBaseSalary: 호봉제 직급 데이터 없음', { year, grade });
                    return 0;
                }
                return gradeData[String(rank)] || 0;
            } else {
                const gradeData = yearTable.salary?.[grade];
                if (!gradeData) {
                    로거_인사?.warn('getBaseSalary: 연봉제 직급 데이터 없음', { year, grade });
                    return 0;
                }
                // 연봉제: baseSalary는 월 기본급
                return gradeData.baseSalary || 0;
            }
        } catch (error) {
            로거_인사?.error('getBaseSalary 오류', error);
            return 0;
        }
    },
    
    // ===== 직책수당 조회 =====
    
    getPositionAllowance(year, position) {
        try {
            if (!position) return 0;
            const allowances = SalarySettingsManager.getPositionAllowancesByYear(year);
            return allowances[position] || 0;
        } catch (error) {
            로거_인사?.error('getPositionAllowance 오류', error);
            return 0;
        }
    },
    
    /**
     * 직책수당 (중도입사자 월할 계산)
     */
    getPositionAllowanceProrated(year, position, entryDate) {
        try {
            if (!position || !entryDate) return 0;
            
            const baseAllowance = this.getPositionAllowance(year, position);
            if (baseAllowance === 0) return 0;
            
            const entryYear = parseInt(entryDate.substring(0, 4), 10);
            const targetYear = parseInt(year, 10);
            
            if (targetYear < entryYear) return 0;
            if (targetYear > entryYear) return baseAllowance;
            
            // 입사 연도와 같은 해: 월할 계산
            const entryMonth = parseInt(entryDate.substring(5, 7), 10);
            const workingMonths = 12 - entryMonth + 1;
            const proratedAllowance = Math.round(baseAllowance * workingMonths / 12);
            
            로거_인사?.debug('직책수당 월할 계산', {
                year, position, entryMonth, workingMonths, baseAllowance, proratedAllowance
            });
            
            return proratedAllowance;
        } catch (error) {
            로거_인사?.error('getPositionAllowanceProrated 오류', error);
            return 0;
        }
    },
    
    // ===== 직무대리 직책수당 =====
    
    getActingPositionForMonth(empId, year, month) {
        try {
            if (typeof 겸직관리_인사 === 'undefined') return null;
            
            const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            
            const concurrents = 겸직관리_인사.getEmployeeConcurrentPositions?.(empId) || [];
            
            for (const cp of concurrents) {
                if (cp.type !== 'acting') continue;
                
                const cpStart = cp.startDate || '';
                const cpEnd = cp.endDate || '9999-12-31';
                
                if (cpStart <= monthEnd && cpEnd >= monthStart) {
                    return cp;
                }
            }
            
            return null;
        } catch (error) {
            로거_인사?.error('getActingPositionForMonth 오류', error);
            return null;
        }
    },
    
    getActingPositionAllowance(empId, year, month) {
        try {
            const acting = this.getActingPositionForMonth(empId, year, month);
            if (!acting) return 0;
            
            const actingPosition = acting.targetPosition || '';
            const allowance = this.getPositionAllowance(year, actingPosition);
            
            로거_인사?.debug('직무대리 직책수당', { empId, year, month, actingPosition, allowance });
            
            return allowance;
        } catch (error) {
            로거_인사?.error('getActingPositionAllowance 오류', error);
            return 0;
        }
    },
    
    // ===== 호봉 계산 =====
    
    /**
     * 특정 날짜 기준 호봉 조회
     * @version 4.0.0 - async API 버전
     */
    async getRankAtDate(emp, targetDate) {
        try {
            if (emp.rank) {
                const startRank = emp.rank.startRank || 1;
                const firstUpgradeDate = emp.rank.firstUpgradeDate;
                
                if (firstUpgradeDate) {
                    // ✅ v4.0.0: API 우선 사용
                    if (typeof API_인사 !== 'undefined') {
                        return await API_인사.calculateCurrentRank(startRank, firstUpgradeDate, targetDate);
                    } else if (typeof RankCalculator !== 'undefined') {
                        return RankCalculator.calculateCurrentRank(startRank, firstUpgradeDate, targetDate);
                    }
                }
                return startRank;
            }
            
            const assignment = this.getAssignmentAtDate(emp, targetDate);
            if (assignment) {
                return assignment.rank || assignment.currentRank || 1;
            }
            
            return 1;
        } catch (error) {
            로거_인사?.error('getRankAtDate 오류', error);
            return 1;
        }
    },
    
    // ===== 명절휴가비 계산 =====
    
    /**
     * 통상임금 산입용 명절휴가비 계산 (월 환산)
     * holidayBonusMethod 설정에 따라:
     * - 'monthly': 현재 월의 기본급 기준 (월별 연동)
     * - 'annual': 설/추석 당일 월의 호봉 기준 (연간 고정)
     * 
     * @param {Object} emp - 직원 정보
     * @param {number} year - 연도
     * @param {string} grade - 직급
     * @param {boolean} isRankBased - 호봉제 여부
     * @param {string} holidayBonusType - 명절휴가비 유형 (percent/fixed)
     * @param {number} currentBaseSalary - 현재 월 기본급 (월별 연동 시 사용)
     * @version 4.0.0 - async API 버전
     */
    async getHolidayBonusForOrdinary(emp, year, grade, isRankBased = true, holidayBonusType = 'percent', currentBaseSalary = 0) {
        try {
            const yearSettings = SalarySettingsManager.getSettingsByYear(year);
            const holidayBonus = yearSettings.holidayBonus || {};
            
            // 통상임금 설정에서 명절휴가비 계산 방식 확인
            const ordinaryWageSettings = this.getOrdinaryWageSettings(year);
            const holidayBonusMethod = ordinaryWageSettings.holidayBonusMethod || 'annual';
            
            let annualHolidayBonus = 0;
            
            // 명절휴가비 비율
            const seolRate = holidayBonus['설']?.rate || 0.6;
            const chuseokRate = holidayBonus['추석']?.rate || 0.6;
            
            if (isRankBased && emp) {
                // 호봉제
                if (holidayBonusMethod === 'monthly' && currentBaseSalary > 0) {
                    // 월별 연동: 현재 월 기본급 기준
                    annualHolidayBonus = currentBaseSalary * (seolRate + chuseokRate);
                    
                    로거_인사?.debug('명절휴가비 계산 (호봉제 - 월별 연동)', {
                        currentBaseSalary, seolRate, chuseokRate, annualHolidayBonus
                    });
                } else {
                    // 연간 고정: 설/추석 당일 월의 호봉 기준으로 각각 계산
                    const seolDate = holidayBonus['설']?.holidayDate || `${year}-02-01`;
                    const chuseokDate = holidayBonus['추석']?.holidayDate || `${year}-09-15`;
                    
                    // 설날 당일 월의 호봉으로 기본급 계산
                    const seolRank = await this.getRankAtDate(emp, seolDate);
                    const seolBaseSalary = this.getBaseSalary(year, grade, seolRank, true);
                    const seolBonus = seolBaseSalary * seolRate;
                    
                    // 추석 당일 월의 호봉으로 기본급 계산
                    const chuseokRank = await this.getRankAtDate(emp, chuseokDate);
                    const chuseokBaseSalary = this.getBaseSalary(year, grade, chuseokRank, true);
                    const chuseokBonus = chuseokBaseSalary * chuseokRate;
                    
                    annualHolidayBonus = seolBonus + chuseokBonus;
                    
                    로거_인사?.debug('명절휴가비 계산 (호봉제 - 연간 고정)', {
                        seolDate, seolRank, seolBaseSalary, seolBonus,
                        chuseokDate, chuseokRank, chuseokBaseSalary, chuseokBonus,
                        annualHolidayBonus
                    });
                }
                
            } else if (!isRankBased) {
                // 연봉제
                if (holidayBonusType === 'fixed') {
                    const yearTable = SalarySettingsManager.getSalaryTableByYear(year);
                    const gradeData = yearTable.salary?.[grade] || {};
                    annualHolidayBonus = (gradeData.seolBonus || 0) + (gradeData.chuseokBonus || 0);
                } else {
                    const baseSalary = currentBaseSalary > 0 ? currentBaseSalary : this.getBaseSalary(year, grade, 1, false);
                    annualHolidayBonus = baseSalary * (seolRate + chuseokRate);
                }
            } else {
                // emp가 없는 경우 (하위 호환)
                const baseSalary = currentBaseSalary > 0 ? currentBaseSalary : this.getBaseSalary(year, grade, 1, isRankBased);
                annualHolidayBonus = baseSalary * (seolRate + chuseokRate);
            }
            
            const monthlyHolidayBonus = Math.round(annualHolidayBonus / 12);
            
            로거_인사?.debug('명절휴가비 계산 (월 환산)', {
                year, grade, isRankBased, holidayBonusMethod, annualHolidayBonus, monthlyHolidayBonus
            });
            
            return monthlyHolidayBonus;
        } catch (error) {
            로거_인사?.error('getHolidayBonusForOrdinary 오류', error);
            return 0;
        }
    },
    
    getHolidayBonusType(grade) {
        try {
            const gradesData = SalarySettingsManager.loadGrades();
            const salaryGrade = gradesData.salaryGrades?.find(g => g.name === grade);
            if (salaryGrade) return salaryGrade.holidayBonusType || 'percent';
            return 'percent';
        } catch (error) {
            로거_인사?.error('getHolidayBonusType 오류', error);
            return 'percent';
        }
    },
    
    isRankBasedGrade(grade) {
        try {
            const gradesData = SalarySettingsManager.loadGrades();
            if (gradesData.rankGrades?.find(g => g.name === grade)) return true;
            if (gradesData.salaryGrades?.find(g => g.name === grade)) return false;
            return true;
        } catch (error) {
            로거_인사?.error('isRankBasedGrade 오류', error);
            return true;
        }
    },
    
    // ===== 통상임금 설정 =====
    
    getOrdinaryWageSettings(year) {
        try {
            if (typeof SalarySettingsManager?.getOrdinarySettingsByYear === 'function') {
                return SalarySettingsManager.getOrdinarySettingsByYear(year);
            }
            return {
                includeHolidayBonus: true,
                includePositionAllowance: true,
                includeActingAllowance: true
            };
        } catch (error) {
            로거_인사?.error('getOrdinaryWageSettings 오류', error);
            return { includeHolidayBonus: true, includePositionAllowance: true, includeActingAllowance: true };
        }
    },
    
    // ===== 통상임금 계산 =====
    
    /**
     * @version 4.0.0 - async API 버전
     */
    async calculateOrdinaryWage(params) {
        try {
            const { emp, year, month, grade, rank, position, entryDate, isRankBased = true, holidayBonusType = 'percent' } = params;
            
            const settings = this.getOrdinaryWageSettings(year);
            
            // 1. 기본급
            const baseSalary = this.getBaseSalary(year, grade, rank, isRankBased);
            
            // 2. 명절휴가비 (월 환산) - 현재 월 기본급 전달
            let monthlyHolidayBonus = 0;
            if (settings.includeHolidayBonus) {
                monthlyHolidayBonus = await this.getHolidayBonusForOrdinary(emp, year, grade, isRankBased, holidayBonusType, baseSalary);
            }
            
            // 3. 직책수당 (중도입사자 월할)
            let positionAllowance = 0;
            if (settings.includePositionAllowance && position) {
                positionAllowance = this.getPositionAllowanceProrated(year, position, entryDate);
            }
            
            // 4. 직무대리 직책수당
            let actingAllowance = 0;
            if (settings.includeActingAllowance && emp) {
                actingAllowance = this.getActingPositionAllowance(emp.id, parseInt(year), month);
            }
            
            const ordinaryWage = baseSalary + monthlyHolidayBonus + positionAllowance + actingAllowance;
            
            로거_인사?.debug('통상임금 계산', { year, month, grade, rank, baseSalary, monthlyHolidayBonus, positionAllowance, actingAllowance, ordinaryWage });
            
            return { baseSalary, monthlyHolidayBonus, positionAllowance, actingAllowance, ordinaryWage, settings };
        } catch (error) {
            로거_인사?.error('calculateOrdinaryWage 오류', error);
            return { baseSalary: 0, monthlyHolidayBonus: 0, positionAllowance: 0, actingAllowance: 0, ordinaryWage: 0, settings: {} };
        }
    },
    
    async getOrdinaryWage(year, grade, rank, position, isRankBased = true, holidayBonusType = 'percent') {
        const result = await this.calculateOrdinaryWage({
            emp: null, year, month: 1, grade, rank, position,
            entryDate: `${year}-01-01`, isRankBased, holidayBonusType
        });
        return result.ordinaryWage;
    },
    
    // ===== 시급 계산 =====
    
    /**
     * 월소정근로시간 계산
     * 
     * @param {number} weeklyHours - 주 소정근로시간 (기본값: 40)
     * @param {number} year - 연도 (설정값 참조용, 기본값: 현재연도)
     * @returns {number} 월소정근로시간
     * 
     * @description
     * 공식: (주 근무시간 + 주휴시간) × (365 ÷ 12 ÷ 7)
     * - 주휴시간 = 주 근무시간 ÷ 40 × 8 (주 15시간 이상 근무 시)
     * - 주 15시간 미만: 주휴수당 없음
     * - 소수점 처리 방식: 급여설정에서 지정 (올림/반올림/버림)
     * 
     * @example
     * SalaryCalculator.getMonthlyWorkingHours(40);  // 반올림 → 209
     * SalaryCalculator.getMonthlyWorkingHours(35);  // 반올림 → 183
     * SalaryCalculator.getMonthlyWorkingHours(25);  // 반올림 → 130
     */
    getMonthlyWorkingHours(weeklyHours = DEFAULT_WEEKLY_HOURS, year = null) {
        try {
            const hours = parseInt(weeklyHours) || DEFAULT_WEEKLY_HOURS;
            const targetYear = year || new Date().getFullYear();
            
            // 소수점 처리 방식 설정 로드
            const roundingMethod = this.getMonthlyHoursRoundingMethod(targetYear);
            
            let monthlyHours;
            
            if (hours < 15) {
                // 주 15시간 미만: 주휴수당 없음
                monthlyHours = hours * WEEKS_PER_MONTH;
            } else {
                // 주휴시간 = 주 근무시간 ÷ 40 × 8
                const weeklyRestHours = (hours / 40) * 8;
                // 월소정근로시간 = (주 근무시간 + 주휴시간) × 4.345...
                monthlyHours = (hours + weeklyRestHours) * WEEKS_PER_MONTH;
            }
            
            // 소수점 처리
            return this.applyRounding(monthlyHours, roundingMethod);
            
        } catch (error) {
            로거_인사?.error('getMonthlyWorkingHours 오류', error);
            return 209;
        }
    },
    
    /**
     * 소수점 처리 방식 설정값 로드
     * @param {number} year - 연도
     * @returns {string} 'ceil' | 'round' | 'floor' (기본값: 'round')
     */
    getMonthlyHoursRoundingMethod(year) {
        try {
            if (typeof SalarySettingsManager !== 'undefined') {
                const settings = SalarySettingsManager.getOrdinarySettingsByYear?.(year) || {};
                return settings.monthlyHoursRounding || 'round';
            }
            return 'round';
        } catch (error) {
            로거_인사?.warn('소수점 처리 방식 로드 실패, 기본값(반올림) 사용', error);
            return 'round';
        }
    },
    
    /**
     * 소수점 처리 적용
     * @param {number} value - 원본 값
     * @param {string} method - 'ceil' | 'round' | 'floor'
     * @returns {number} 처리된 값
     */
    applyRounding(value, method) {
        switch (method) {
            case 'ceil':
                return Math.ceil(value);
            case 'floor':
                return Math.floor(value);
            case 'round':
            default:
                return Math.round(value);
        }
    },
    
    /**
     * 시급 절사 방식 설정값 로드
     * @param {number} year - 연도
     * @returns {Object} { type: 'decimal'|'integer', unit: 1|10, method: 'floor'|'round'|'ceil' }
     */
    getHourlyWageRoundingSettings(year) {
        try {
            if (typeof SalarySettingsManager !== 'undefined') {
                const settings = SalarySettingsManager.getOrdinarySettingsByYear?.(year) || {};
                return settings.hourlyWageRounding || { type: 'decimal', unit: 1, method: 'floor' };
            }
            return { type: 'decimal', unit: 1, method: 'floor' };
        } catch (error) {
            로거_인사?.warn('시급 절사 방식 로드 실패, 기본값(소수점 유지) 사용', error);
            return { type: 'decimal', unit: 1, method: 'floor' };
        }
    },
    
    /**
     * 시급에 절사 방식 적용
     * @param {number} hourlyWage - 원본 시급 (소수점)
     * @param {Object} roundingSettings - 절사 설정
     * @returns {number} 절사 적용된 시급
     */
    applyHourlyWageRounding(hourlyWage, roundingSettings) {
        try {
            if (!roundingSettings || roundingSettings.type === 'decimal') {
                return hourlyWage;  // 소수점 유지
            }
            
            const { unit, method } = roundingSettings;
            const unitValue = unit || 1;
            
            // 단위에 맞게 절사
            switch (method) {
                case 'ceil':
                    return Math.ceil(hourlyWage / unitValue) * unitValue;
                case 'round':
                    return Math.round(hourlyWage / unitValue) * unitValue;
                case 'floor':
                default:
                    return Math.floor(hourlyWage / unitValue) * unitValue;
            }
        } catch (error) {
            로거_인사?.error('applyHourlyWageRounding 오류', error);
            return hourlyWage;
        }
    },
    
    /**
     * ⭐ [v3.3.0] 배율 적용 시급 계산 (설정에 따른 절사 적용)
     * 
     * @param {number} rawHourlyWage - 원시급 (통상임금 ÷ 월소정근로시간)
     * @param {number} rate - 배율 (1, 1.5 등)
     * @param {number} year - 연도 (설정 로드용)
     * @returns {number} 배율 적용된 시급 (설정에 따라 절사)
     * 
     * @description
     * 급여설정의 hourlyWageRounding.applyTiming 설정에 따라 계산합니다.
     * - 'after' (기본값): 원시급 × 배율 → 절사
     * - 'before': 원시급 → 절사 → × 배율
     */
    getRatedHourlyWage(rawHourlyWage, rate, year = null) {
        try {
            if (!rawHourlyWage || rate <= 0) return 0;
            
            const targetYear = year || new Date().getFullYear();
            const roundingSettings = this.getHourlyWageRoundingSettings(targetYear);
            
            // 소수점 유지 설정이면 그냥 곱해서 반환
            if (!roundingSettings || roundingSettings.type === 'decimal') {
                return rawHourlyWage * rate;
            }
            
            const applyTiming = roundingSettings.applyTiming || 'after';
            
            if (applyTiming === 'before') {
                // 배율 적용 전 절사: 원시급 → 절사 → × 배율
                const roundedHourly = this.applyHourlyWageRounding(rawHourlyWage, roundingSettings);
                return roundedHourly * rate;
            } else {
                // 배율 적용 후 절사: 원시급 × 배율 → 절사
                const ratedValue = rawHourlyWage * rate;
                return this.applyHourlyWageRounding(ratedValue, roundingSettings);
            }
        } catch (error) {
            로거_인사?.error('getRatedHourlyWage 오류', error);
            return rawHourlyWage * rate;
        }
    },
    
    /**
     * 시급 계산 (설정에 따른 절사 적용)
     * 
     * @param {number} ordinaryWage - 통상임금
     * @param {number} monthlyWorkingHours - 월소정근로시간
     * @param {number} year - 연도 (설정 로드용, 기본값: 현재연도)
     * @returns {number} 시급 (설정에 따라 소수점 또는 정수)
     * 
     * @description
     * 급여설정의 hourlyWageRounding 설정에 따라 시급을 계산합니다.
     * - 소수점 유지: 그대로 반환
     * - 정수 처리: 단위/방식에 따라 절사
     */
    getHourlyWage(ordinaryWage, monthlyWorkingHours, year = null) {
        try {
            if (!monthlyWorkingHours || monthlyWorkingHours <= 0) return 0;
            
            const rawHourlyWage = ordinaryWage / monthlyWorkingHours;
            
            // 설정에 따른 절사 적용
            const targetYear = year || new Date().getFullYear();
            const roundingSettings = this.getHourlyWageRoundingSettings(targetYear);
            
            return this.applyHourlyWageRounding(rawHourlyWage, roundingSettings);
        } catch (error) {
            로거_인사?.error('getHourlyWage 오류', error);
            return 0;
        }
    },
    
    /**
     * 시급 계산 (소수점 유지 - 내부 계산용)
     * 
     * @param {number} ordinaryWage - 통상임금
     * @param {number} monthlyWorkingHours - 월소정근로시간
     * @returns {number} 시급 (소수점 유지)
     * 
     * @description
     * 설정과 무관하게 항상 소수점을 유지합니다.
     * 내부 정밀 계산이 필요한 경우 사용합니다.
     */
    getHourlyWageRaw(ordinaryWage, monthlyWorkingHours) {
        try {
            if (!monthlyWorkingHours || monthlyWorkingHours <= 0) return 0;
            return ordinaryWage / monthlyWorkingHours;
        } catch (error) {
            로거_인사?.error('getHourlyWageRaw 오류', error);
            return 0;
        }
    },
    
    /**
     * 시급 표시용 (설정에 따른 절사 적용 후 정수 표시)
     * 
     * @param {number} ordinaryWage - 통상임금
     * @param {number} monthlyWorkingHours - 월소정근로시간
     * @param {number} year - 연도 (설정 로드용)
     * @returns {number} 시급 (정수)
     * 
     * @description
     * 화면 표시용으로 사용합니다.
     * 설정이 소수점 유지인 경우에도 정수로 버림 표시합니다.
     */
    getHourlyWageDisplay(ordinaryWage, monthlyWorkingHours, year = null) {
        try {
            if (!monthlyWorkingHours || monthlyWorkingHours <= 0) return 0;
            
            const targetYear = year || new Date().getFullYear();
            const roundingSettings = this.getHourlyWageRoundingSettings(targetYear);
            
            const rawHourlyWage = ordinaryWage / monthlyWorkingHours;
            
            if (roundingSettings.type === 'decimal') {
                // 소수점 유지 설정이어도 표시는 정수로 (버림)
                return Math.floor(rawHourlyWage);
            }
            
            // 정수 처리 설정이면 그대로 적용
            return this.applyHourlyWageRounding(rawHourlyWage, roundingSettings);
        } catch (error) {
            로거_인사?.error('getHourlyWageDisplay 오류', error);
            return 0;
        }
    },
    
    // ===== 월별 시간급 계산 =====
    
    /**
     * @version 4.0.0 - async API 버전
     */
    async getMonthlyHourlyWage(emp, year, month) {
        try {
            const targetDate = `${year}-${String(month).padStart(2, '0')}-15`;
            const assignment = this.getAssignmentAtDate(emp, targetDate);
            if (!assignment) return null;
            
            const grade = assignment.grade || '';
            const position = assignment.position || '';
            const weeklyHours = assignment.workingHours || emp.employment?.weeklyWorkingHours || DEFAULT_WEEKLY_HOURS;
            const entryDate = emp.employment?.entryDate || `${year}-01-01`;
            
            let isRankBased = true;
            if (assignment.paymentMethod) {
                isRankBased = assignment.paymentMethod === 'rank' || assignment.paymentMethod === '호봉제';
            } else {
                isRankBased = this.isRankBasedGrade(grade);
            }
            
            const rank = await this.getRankAtDate(emp, targetDate);
            const holidayBonusType = this.getHolidayBonusType(grade);
            
            const ordinaryResult = await this.calculateOrdinaryWage({
                emp, year, month, grade, rank, position, entryDate, isRankBased, holidayBonusType
            });
            
            const monthlyWorkingHours = this.getMonthlyWorkingHours(weeklyHours, year);
            const hourlyWage = this.getHourlyWage(ordinaryResult.ordinaryWage, monthlyWorkingHours, year);
            
            return {
                year, month, grade, rank: isRankBased ? rank : null, position, isRankBased,
                baseSalary: ordinaryResult.baseSalary,
                monthlyHolidayBonus: ordinaryResult.monthlyHolidayBonus,
                positionAllowance: ordinaryResult.positionAllowance,
                actingAllowance: ordinaryResult.actingAllowance,
                ordinaryWage: ordinaryResult.ordinaryWage,
                weeklyWorkingHours: weeklyHours,
                monthlyWorkingHours,
                hourlyWage
            };
        } catch (error) {
            로거_인사?.error('getMonthlyHourlyWage 오류', { empId: emp?.id, year, month, error });
            return null;
        }
    },
    
    /**
     * @version 4.0.0 - async API 버전
     */
    async getYearlyHourlyWages(emp, year) {
        try {
            const results = [];
            for (let month = 1; month <= 12; month++) {
                const monthlyData = await this.getMonthlyHourlyWage(emp, year, month);
                if (monthlyData) results.push(monthlyData);
            }
            로거_인사?.info('연간 월별 시간급 계산 완료', { empId: emp?.id, year, monthCount: results.length });
            return results;
        } catch (error) {
            로거_인사?.error('getYearlyHourlyWages 오류', error);
            return [];
        }
    },
    
    // ===== 종합 계산 =====
    
    /**
     * @version 4.0.0 - async API 버전
     */
    async getEmployeeSalaryInfo(empId, targetDate) {
        try {
            // db 호환성: findEmployee 또는 data.employees에서 직접 찾기
            let emp = null;
            if (typeof db !== 'undefined') {
                emp = db.findEmployee?.(empId) || 
                      db.getById?.(empId) || 
                      db.data?.employees?.find(e => e.id === empId);
            }
            if (!emp) {
                로거_인사?.warn('직원을 찾을 수 없음', { empId });
                return null;
            }
            
            const assignment = this.getAssignmentAtDate(emp, targetDate);
            if (!assignment) {
                로거_인사?.warn('해당 날짜의 발령을 찾을 수 없음', { empId, targetDate });
                return null;
            }
            
            const year = parseInt(targetDate.substring(0, 4), 10);
            const month = parseInt(targetDate.substring(5, 7), 10);
            
            const grade = assignment.grade || '';
            const position = assignment.position || '';
            const weeklyWorkingHours = assignment.workingHours || emp.employment?.weeklyWorkingHours || DEFAULT_WEEKLY_HOURS;
            const entryDate = emp.employment?.entryDate || `${year}-01-01`;
            
            let isRankBased = true;
            if (assignment.hasOwnProperty('isRankBased')) {
                isRankBased = assignment.isRankBased;
            } else if (assignment.paymentMethod) {
                isRankBased = assignment.paymentMethod === 'rank' || assignment.paymentMethod === '호봉제';
            } else {
                isRankBased = this.isRankBasedGrade(grade);
            }
            
            const rank = await this.getRankAtDate(emp, targetDate);
            const holidayBonusType = this.getHolidayBonusType(grade);
            
            const ordinaryResult = await this.calculateOrdinaryWage({
                emp, year, month, grade, rank, position, entryDate, isRankBased, holidayBonusType
            });
            
            const monthlyWorkingHours = this.getMonthlyWorkingHours(weeklyWorkingHours, year);
            // ⭐ [v3.3.0] 원시급 (절사 전) - 배율 적용 계산용
            const rawHourlyWage = monthlyWorkingHours > 0 ? ordinaryResult.ordinaryWage / monthlyWorkingHours : 0;
            // 절사 적용된 시급 (기존)
            const hourlyWage = this.getHourlyWage(ordinaryResult.ordinaryWage, monthlyWorkingHours, year);
            
            const result = {
                employee: emp,
                assignment: assignment,
                targetDate: targetDate,
                year: year,
                month: month,
                grade: grade,
                rank: isRankBased ? rank : null,
                position: position,
                isRankBased: isRankBased,
                holidayBonusType: holidayBonusType,
                entryDate: entryDate,
                baseSalary: ordinaryResult.baseSalary,
                positionAllowance: ordinaryResult.positionAllowance,
                monthlyHolidayBonus: ordinaryResult.monthlyHolidayBonus,
                actingAllowance: ordinaryResult.actingAllowance,
                ordinarySettings: ordinaryResult.settings,
                ordinaryWage: ordinaryResult.ordinaryWage,
                weeklyWorkingHours: weeklyWorkingHours,
                monthlyWorkingHours: monthlyWorkingHours,
                rawHourlyWage: rawHourlyWage,   // ⭐ [v3.3.0] 원시급 추가
                hourlyWage: hourlyWage
            };
            
            로거_인사?.info('직원 급여 정보 조회 완료', {
                empId: emp.id, name: emp.personalInfo?.name || emp.personal?.name,
                grade, rank, position, ordinaryWage: ordinaryResult.ordinaryWage, hourlyWage
            });
            
            return result;
        } catch (error) {
            로거_인사?.error('getEmployeeSalaryInfo 오류', { empId, targetDate, error });
            return null;
        }
    },
    
    /**
     * @version 4.0.0 - async API 버전
     */
    async getAllEmployeesSalaryInfo(targetDate) {
        try {
            // db 호환성: data.employees 또는 getEmployees() 또는 getAll()
            let employees = [];
            if (typeof db !== 'undefined') {
                employees = db.data?.employees || db.getEmployees?.() || db.getAll?.() || [];
            }
            const results = [];
            
            for (const emp of employees) {
                const info = await this.getEmployeeSalaryInfo(emp.id, targetDate);
                if (info) results.push(info);
            }
            
            로거_인사?.info('전체 재직자 급여 정보 조회 완료', { targetDate, totalCount: employees.length, activeCount: results.length });
            return results;
        } catch (error) {
            로거_인사?.error('getAllEmployeesSalaryInfo 오류', error);
            return [];
        }
    },
    
    // ===== 호봉 역산 =====
    
    getRankBySalary(year, grade, salary) {
        try {
            const yearTable = SalarySettingsManager.getSalaryTableByYear(year);
            const gradeData = yearTable.rank?.[grade];
            
            if (!gradeData) return null;
            
            for (const [rank, amount] of Object.entries(gradeData)) {
                if (amount === salary) return parseInt(rank, 10);
            }
            
            return null;
        } catch (error) {
            로거_인사?.error('getRankBySalary 오류', error);
            return null;
        }
    },
    
    findClosestRank(year, grade, salary) {
        try {
            const yearTable = SalarySettingsManager.getSalaryTableByYear(year);
            const gradeData = yearTable.rank?.[grade];
            
            if (!gradeData) return { rank: null, exactMatch: false, difference: null };
            
            let closestRank = null;
            let minDiff = Infinity;
            
            for (const [rank, amount] of Object.entries(gradeData)) {
                const diff = Math.abs(amount - salary);
                if (diff === 0) return { rank: parseInt(rank, 10), exactMatch: true, difference: 0 };
                if (diff < minDiff) {
                    minDiff = diff;
                    closestRank = parseInt(rank, 10);
                }
            }
            
            return { rank: closestRank, exactMatch: false, difference: minDiff };
        } catch (error) {
            로거_인사?.error('findClosestRank 오류', error);
            return { rank: null, exactMatch: false, difference: null };
        }
    }
};

// ===== 전역 등록 =====

if (typeof window !== 'undefined') {
    window.SalaryCalculator = SalaryCalculator;
}

if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
    console.log('✅ 급여계산기_인사.js v2.1.0 로드 완료');
}
