/**
 * 호봉계산기_인사.js - API 연동 버전
 * 
 * 호봉 및 경력 계산 로직 (로컬 + 서버 API)
 * - 기본: 로컬 계산 (기존 호환)
 * - 선택: API 호출 (보안 강화 모드)
 * 
 * @version 4.0.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v4.0.0 (2026-01-21) ⭐ API 연동 버전
 *   - 로컬 계산 유지 (기존 100% 호환)
 *   - API 호출 함수 추가 (*Async 버전)
 *   - 설정으로 API 모드 전환 가능
 */

// ===== API 모드 설정 =====
const 호봉계산_설정 = {
    API_MODE: false  // true: API 우선, false: 로컬 우선 (기본값)
};

// ===== 날짜 유틸리티 =====

const DateUtils = {
    
    formatDate(date) {
        try {
            if (typeof date === 'string') return date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('날짜 형식화 실패', error);
            return '1900-01-01';
        }
    },
    
    parseDate(dateStr) {
        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            return { year, month, day };
        } catch (error) {
            console.error('날짜 파싱 실패', error);
            return { year: 1900, month: 1, day: 1 };
        }
    },
    
    createDate(year, month, day) {
        try {
            return new Date(year, month - 1, day);
        } catch (error) {
            return new Date(1900, 0, 1);
        }
    },
    
    addMonths(dateStr, months) {
        try {
            const parsed = this.parseDate(dateStr);
            let newYear = parsed.year;
            let newMonth = parsed.month + months;
            
            while (newMonth > 12) { newYear++; newMonth -= 12; }
            while (newMonth < 1) { newYear--; newMonth += 12; }
            
            return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
        } catch (error) {
            return dateStr;
        }
    },
    
    addDays(dateStr, days) {
        try {
            const parsed = this.parseDate(dateStr);
            const date = this.createDate(parsed.year, parsed.month, parsed.day);
            date.setDate(date.getDate() + days);
            return this.formatDate(date);
        } catch (error) {
            return dateStr;
        }
    }
};

// ===== 근속기간 계산기 =====

const TenureCalculator = {
    
    /**
     * 두 날짜 사이의 기간 계산 (동기 - 로컬)
     */
    calculate(startDate, endDate) {
        try {
            const start = DateUtils.parseDate(startDate);
            const end = DateUtils.parseDate(endDate);
            const startDateObj = DateUtils.createDate(start.year, start.month, start.day);
            const endDateObj = DateUtils.createDate(end.year, end.month, end.day);
            
            let years = 0, months = 0, days = 0;
            let currentDate = new Date(startDateObj);
            
            // 년 계산
            while (true) {
                const nextYearDate = new Date(currentDate);
                nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
                nextYearDate.setDate(nextYearDate.getDate() - 1);
                
                if (nextYearDate <= endDateObj) {
                    years++;
                    currentDate = new Date(nextYearDate);
                    currentDate.setDate(currentDate.getDate() + 1);
                } else {
                    break;
                }
            }
            
            // 월 계산
            while (true) {
                const nextMonthDate = new Date(currentDate);
                nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                
                if (nextMonthDate.getDate() < currentDate.getDate()) {
                    nextMonthDate.setDate(0);
                } else {
                    nextMonthDate.setDate(nextMonthDate.getDate() - 1);
                }
                
                if (nextMonthDate <= endDateObj) {
                    months++;
                    currentDate = new Date(nextMonthDate);
                    currentDate.setDate(currentDate.getDate() + 1);
                } else {
                    break;
                }
            }
            
            // 일 계산
            while (currentDate <= endDateObj) {
                days++;
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return { years, months, days };
            
        } catch (error) {
            console.error('근속기간 계산 실패', error);
            return { years: 0, months: 0, days: 0 };
        }
    },
    
    /**
     * 비동기 API 버전
     */
    async calculateAsync(startDate, endDate) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.calculateTenure(startDate, endDate);
            }
            return this.calculate(startDate, endDate);
        } catch (error) {
            console.error('API 호출 실패, 로컬 계산 사용', error);
            return this.calculate(startDate, endDate);
        }
    },
    
    format(tenure) {
        try {
            return `${tenure.years}년 ${tenure.months}개월 ${tenure.days}일`;
        } catch (error) {
            return '0년 0개월 0일';
        }
    }
};

// ===== 호봉 계산기 =====

const RankCalculator = {
    
    /**
     * 초기 호봉 계산 (동기 - 로컬)
     */
    calculateInitialRank(careerYears, careerMonths) {
        try {
            const years = parseInt(careerYears) || 0;
            return Math.max(1, years + 1);
        } catch (error) {
            return 1;
        }
    },
    
    /**
     * 첫승급일 계산 (동기 - 로컬)
     */
    calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays) {
        try {
            const entry = DateUtils.parseDate(entryDate);
            
            let baseMonth = entry.month;
            if (entry.day !== 1) {
                baseMonth += 1;
                if (baseMonth > 12) baseMonth = 1;
            }
            
            const remainingMonths = careerMonths || 0;
            const remainingDays = careerDays || 0;
            
            let monthsNeeded = 12 - remainingMonths;
            let daysAdjustment = 0;
            
            if (remainingDays > 0) {
                monthsNeeded -= 1;
                daysAdjustment = 30 - remainingDays;
            }
            
            let upgradeDate = entryDate;
            
            if (monthsNeeded > 0) {
                upgradeDate = DateUtils.addMonths(upgradeDate, monthsNeeded);
            }
            if (daysAdjustment > 0) {
                upgradeDate = DateUtils.addDays(upgradeDate, daysAdjustment);
            }
            
            const upgradeParsed = DateUtils.parseDate(upgradeDate);
            let finalMonth = upgradeParsed.month;
            let finalYear = upgradeParsed.year;
            
            if (upgradeParsed.day !== 1) {
                finalMonth += 1;
                if (finalMonth > 12) {
                    finalMonth = 1;
                    finalYear += 1;
                }
            }
            
            return `${finalYear}-${String(finalMonth).padStart(2, '0')}-01`;
            
        } catch (error) {
            console.error('첫승급일 계산 실패', error);
            const entry = DateUtils.parseDate(entryDate);
            return `${entry.year + 1}-${String(entry.month).padStart(2, '0')}-01`;
        }
    },
    
    /**
     * 현재 호봉 계산 (동기 - 로컬)
     */
    calculateCurrentRank(startRank, firstUpgradeDate, baseDate) {
        try {
            const base = DateUtils.parseDate(baseDate);
            const firstUpgrade = DateUtils.parseDate(firstUpgradeDate);
            const baseObj = DateUtils.createDate(base.year, base.month, base.day);
            const firstUpgradeObj = DateUtils.createDate(firstUpgrade.year, firstUpgrade.month, firstUpgrade.day);
            
            if (baseObj < firstUpgradeObj) {
                return startRank;
            }
            
            let yearDiff = base.year - firstUpgrade.year;
            if (base.month < firstUpgrade.month || 
                (base.month === firstUpgrade.month && base.day < firstUpgrade.day)) {
                yearDiff--;
            }
            
            return startRank + 1 + yearDiff;
            
        } catch (error) {
            console.error('현재 호봉 계산 실패', error);
            return startRank;
        }
    },
    
    /**
     * 차기승급일 계산 (동기 - 로컬)
     */
    calculateNextUpgradeDate(firstUpgradeDate, baseDate) {
        try {
            // baseDate가 없으면 오늘 날짜 사용
            if (!baseDate) {
                baseDate = DateUtils.formatDate(new Date());
            }
            
            const firstUpgrade = DateUtils.parseDate(firstUpgradeDate);
            const base = DateUtils.parseDate(baseDate);
            
            const firstUpgradeObj = DateUtils.createDate(firstUpgrade.year, firstUpgrade.month, firstUpgrade.day);
            const baseObj = DateUtils.createDate(base.year, base.month, base.day);
            
            if (firstUpgradeObj > baseObj) {
                return firstUpgradeDate;
            }
            
            let candidateYear = base.year;
            let nextUpgradeObj = DateUtils.createDate(candidateYear, firstUpgrade.month, firstUpgrade.day);
            
            while (nextUpgradeObj <= baseObj) {
                candidateYear++;
                nextUpgradeObj = DateUtils.createDate(candidateYear, firstUpgrade.month, firstUpgrade.day);
            }
            
            return DateUtils.formatDate(nextUpgradeObj);
            
        } catch (error) {
            console.error('차기승급일 계산 실패', error);
            return DateUtils.addMonths(baseDate || DateUtils.formatDate(new Date()), 12);
        }
    },
    
    /**
     * 통합 호봉 계산 (호봉획정표, 인사카드용)
     */
    calculate(entryDate, firstUpgradeDate, startRank, baseDate) {
        try {
            // 인자가 emp 객체인 경우 처리 (인사카드용)
            if (typeof entryDate === 'object' && entryDate.employment) {
                const emp = entryDate;
                baseDate = firstUpgradeDate; // 두 번째 인자가 baseDate
                entryDate = emp.employment?.entryDate || '';
                firstUpgradeDate = emp.rank?.firstUpgradeDate || '';
                startRank = emp.rank?.startRank || 1;
            }
            
            const currentGrade = this.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
            const nextUpgradeDate = this.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
            
            return {
                entryDate,
                firstUpgradeDate,
                startRank,
                baseDate,
                currentGrade,
                nextUpgradeDate
            };
        } catch (error) {
            console.error('통합 호봉 계산 실패', error);
            return {
                currentGrade: startRank || 1,
                nextUpgradeDate: firstUpgradeDate || ''
            };
        }
    },
    
    // ===== 비동기 API 버전들 =====
    
    async calculateInitialRankAsync(careerYears, careerMonths) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.calculateInitialRank(careerYears, careerMonths);
            }
            return this.calculateInitialRank(careerYears, careerMonths);
        } catch (error) {
            return this.calculateInitialRank(careerYears, careerMonths);
        }
    },
    
    async calculateFirstUpgradeDateAsync(entryDate, careerYears, careerMonths, careerDays) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays);
            }
            return this.calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays);
        } catch (error) {
            return this.calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays);
        }
    },
    
    async calculateCurrentRankAsync(startRank, firstUpgradeDate, baseDate) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
            }
            return this.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
        } catch (error) {
            return this.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
        }
    },
    
    async calculateNextUpgradeDateAsync(firstUpgradeDate, baseDate) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
            }
            return this.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
        } catch (error) {
            return this.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
        }
    }
};

// ===== 경력 계산기 =====

const CareerCalculator = {
    
    STANDARD_WORKING_HOURS: 40,
    
    /**
     * 경력 환산 (동기 - 로컬)
     */
    applyConversionRate(period, rate, workingHours = 40) {
        try {
            let validWorkingHours = workingHours;
            if (!validWorkingHours || isNaN(validWorkingHours)) validWorkingHours = 40;
            if (validWorkingHours > 40) validWorkingHours = 40;
            if (validWorkingHours < 1) validWorkingHours = 1;
            
            const hoursRate = validWorkingHours / 40;
            const finalRate = (rate / 100) * hoursRate;
            
            const yearConverted = period.years * finalRate;
            const yearInt = Math.floor(yearConverted);
            const yearDecimal = yearConverted - yearInt;
            const yearToMonths = yearDecimal * 12;
            const yearMonthsInt = Math.floor(yearToMonths);
            const yearMonthsDecimal = yearToMonths - yearMonthsInt;
            const yearToDays = Math.floor(yearMonthsDecimal * 30);
            
            const monthConverted = period.months * finalRate;
            const monthInt = Math.floor(monthConverted);
            const monthDecimal = monthConverted - monthInt;
            const monthToDays = Math.floor(monthDecimal * 30);
            
            const dayConverted = Math.floor(period.days * finalRate);
            
            let totalYears = yearInt;
            let totalMonths = yearMonthsInt + monthInt;
            let totalDays = yearToDays + monthToDays + dayConverted;
            
            if (totalDays >= 30) {
                totalMonths += Math.floor(totalDays / 30);
                totalDays = totalDays % 30;
            }
            if (totalMonths >= 12) {
                totalYears += Math.floor(totalMonths / 12);
                totalMonths = totalMonths % 12;
            }
            
            return { years: totalYears, months: totalMonths, days: totalDays };
            
        } catch (error) {
            console.error('경력 환산 실패', error);
            return { years: 0, months: 0, days: 0 };
        }
    },
    
    /**
     * 전체 경력 합산 (동기 - 로컬)
     */
    calculateTotalCareer(careers) {
        try {
            if (!careers || careers.length === 0) {
                return { totalYears: 0, totalMonths: 0, totalDays: 0, convertedYears: 0, convertedMonths: 0, convertedDays: 0 };
            }
            
            let totalDays = 0;
            
            for (const career of careers) {
                if (!career.startDate || !career.endDate) continue;
                
                const period = TenureCalculator.calculate(career.startDate, career.endDate);
                const rate = career.rate ?? career.conversionRate ?? 100;
                const workingHours = career.workingHours ?? 40;
                
                const converted = this.applyConversionRate(period, rate, workingHours);
                totalDays += converted.years * 365 + converted.months * 30 + converted.days;
            }
            
            const totalYears = Math.floor(totalDays / 365);
            const remainingAfterYears = totalDays % 365;
            const totalMonths = Math.floor(remainingAfterYears / 30);
            const remainingDays = remainingAfterYears % 30;
            
            return {
                totalYears,
                totalMonths,
                totalDays: remainingDays,
                convertedYears: totalYears,
                convertedMonths: totalMonths,
                convertedDays: remainingDays
            };
            
        } catch (error) {
            console.error('전체 경력 합산 실패', error);
            return { totalYears: 0, totalMonths: 0, totalDays: 0, convertedYears: 0, convertedMonths: 0, convertedDays: 0 };
        }
    },
    
    // 비동기 API 버전들
    async applyConversionRateAsync(period, rate, workingHours = 40) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                return await API_인사.applyConversionRate(period, rate, workingHours);
            }
            return this.applyConversionRate(period, rate, workingHours);
        } catch (error) {
            return this.applyConversionRate(period, rate, workingHours);
        }
    },
    
    async calculateTotalCareerAsync(careers) {
        try {
            if (typeof API_인사 !== 'undefined' && 호봉계산_설정.API_MODE) {
                const result = await API_인사.calculateTotalCareer(careers);
                return {
                    totalYears: result.totalYears,
                    totalMonths: result.totalMonths,
                    totalDays: result.totalDays,
                    convertedYears: result.totalYears,
                    convertedMonths: result.totalMonths,
                    convertedDays: result.totalDays
                };
            }
            return this.calculateTotalCareer(careers);
        } catch (error) {
            return this.calculateTotalCareer(careers);
        }
    },
    
    getWorkingHoursRate(workingHours) {
        const hours = Math.min(40, Math.max(1, workingHours || 40));
        return hours / 40;
    },
    
    formatWorkingHoursPercent(workingHours) {
        const rate = this.getWorkingHoursRate(workingHours);
        return `${(rate * 100).toFixed(0)}%`;
    }
};

// ===== 현 기관 경력 계산기 =====

const InternalCareerCalculator = {
    
    /**
     * 발령별 인정율 적용하여 현 기관 경력 계산
     */
    calculateWithPriorCareerRate(emp, baseDate) {
        try {
            const assignments = emp.assignments || [];
            if (assignments.length === 0) {
                return { totalDays: 0, years: 0, months: 0, days: 0, details: [] };
            }
            
            const sorted = [...assignments]
                .filter(a => a.startDate)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            const rateMap = this._buildRateMap(sorted, baseDate);
            
            let totalAdjustedDays = 0;
            const details = [];
            
            for (let i = 0; i < sorted.length; i++) {
                const assign = sorted[i];
                const periodStart = assign.startDate;
                
                let periodEnd;
                if (i < sorted.length - 1) {
                    periodEnd = DateUtils.addDays(sorted[i + 1].startDate, -1);
                } else {
                    periodEnd = baseDate;
                }
                
                if (periodStart > baseDate) continue;
                
                const effectiveEnd = periodEnd > baseDate ? baseDate : periodEnd;
                
                const period = TenureCalculator.calculate(periodStart, effectiveEnd);
                const originalDays = period.years * 365 + period.months * 30 + period.days;
                
                const rateInfo = rateMap[assign.id];
                const rateToApply = rateInfo?.rate ?? 100;
                const rateNote = rateInfo?.note || '';
                
                const adjustedDays = Math.floor(originalDays * (rateToApply / 100));
                totalAdjustedDays += adjustedDays;
                
                details.push({
                    assignmentId: assign.id,
                    dept: assign.dept,
                    position: assign.position,
                    startDate: periodStart,
                    endDate: effectiveEnd,
                    rate: rateToApply,
                    originalDays,
                    adjustedDays,
                    note: rateNote || (rateToApply < 100 ? `${rateToApply}% 적용` : '100% 적용')
                });
            }
            
            const years = Math.floor(totalAdjustedDays / 365);
            const remainingAfterYears = totalAdjustedDays % 365;
            const months = Math.floor(remainingAfterYears / 30);
            const days = remainingAfterYears % 30;
            
            return { totalDays: totalAdjustedDays, years, months, days, details };
            
        } catch (error) {
            console.error('현 기관 경력 계산 실패:', error);
            return { totalDays: 0, years: 0, months: 0, days: 0, details: [] };
        }
    },
    
    _buildRateMap(assignments, baseDate) {
        const rateMap = {};
        
        for (let i = 0; i < assignments.length; i++) {
            const assign = assignments[i];
            
            if (baseDate && assign.startDate > baseDate) continue;
            
            if (assign.priorCareerRates && typeof assign.priorCareerRates === 'object') {
                for (const [targetAssignId, rateInfo] of Object.entries(assign.priorCareerRates)) {
                    if (rateInfo && typeof rateInfo.rate === 'number') {
                        rateMap[targetAssignId] = {
                            rate: rateInfo.rate,
                            note: rateInfo.note || '',
                            setBy: assign.id
                        };
                    }
                }
            }
            
            if (assign.priorCareerRate !== null && assign.priorCareerRate !== undefined) {
                const prevAssign = assignments[i - 1];
                if (prevAssign && !rateMap[prevAssign.id]) {
                    rateMap[prevAssign.id] = {
                        rate: assign.priorCareerRate,
                        note: assign.priorCareerRateNote || '',
                        setBy: assign.id,
                        legacy: true
                    };
                }
            }
        }
        
        return rateMap;
    },
    
    hasPriorCareerRateSettings(emp) {
        const assignments = emp.assignments || [];
        return assignments.some(a => {
            if (a.priorCareerRates && typeof a.priorCareerRates === 'object') {
                const rates = Object.values(a.priorCareerRates);
                if (rates.some(r => r && typeof r.rate === 'number' && r.rate < 100)) return true;
            }
            if (a.priorCareerRate !== null && a.priorCareerRate !== undefined && a.priorCareerRate < 100) return true;
            return false;
        });
    },
    
    getPriorCareerRateSummary(emp) {
        const assignments = emp.assignments || [];
        const summaries = [];
        
        assignments.forEach(a => {
            if (a.priorCareerRates && typeof a.priorCareerRates === 'object') {
                const targetAssignments = [];
                for (const [targetId, rateInfo] of Object.entries(a.priorCareerRates)) {
                    if (rateInfo && typeof rateInfo.rate === 'number') {
                        const targetAssign = assignments.find(x => x.id === targetId);
                        targetAssignments.push({
                            targetId,
                            targetDept: targetAssign?.dept || '-',
                            rate: rateInfo.rate,
                            note: rateInfo.note || ''
                        });
                    }
                }
                if (targetAssignments.length > 0) {
                    summaries.push({ date: a.startDate, dept: a.dept, targetAssignments, isNewFormat: true });
                }
            }
            
            if (a.priorCareerRate !== null && a.priorCareerRate !== undefined) {
                if (!summaries.some(s => s.date === a.startDate && s.isNewFormat)) {
                    summaries.push({
                        date: a.startDate,
                        dept: a.dept,
                        rate: a.priorCareerRate,
                        note: a.priorCareerRateNote || '',
                        isNewFormat: false
                    });
                }
            }
        });
        
        return summaries;
    },
    
    getPriorRatesForAssignment(assignment, allAssignments) {
        if (!assignment || !allAssignments) return [];
        
        const sorted = [...allAssignments]
            .filter(a => a.startDate)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        const currentIndex = sorted.findIndex(a => a.id === assignment.id);
        if (currentIndex <= 0) return [];
        
        const priorRates = [];
        const priorCareerRates = assignment.priorCareerRates || {};
        
        for (let i = 0; i < currentIndex; i++) {
            const prevAssign = sorted[i];
            const rateInfo = priorCareerRates[prevAssign.id];
            
            priorRates.push({
                assignmentId: prevAssign.id,
                dept: prevAssign.dept,
                position: prevAssign.position,
                startDate: prevAssign.startDate,
                endDate: sorted[i + 1] ? DateUtils.addDays(sorted[i + 1].startDate, -1) : null,
                rate: rateInfo?.rate ?? null,
                note: rateInfo?.note || '',
                hasRate: rateInfo?.rate !== null && rateInfo?.rate !== undefined
            });
        }
        
        return priorRates;
    }
};

// ===== 전역 노출 =====

if (typeof window !== 'undefined') {
    window.DateUtils = DateUtils;
    window.TenureCalculator = TenureCalculator;
    window.RankCalculator = RankCalculator;
    window.CareerCalculator = CareerCalculator;
    window.InternalCareerCalculator = InternalCareerCalculator;
    window.호봉계산_설정 = 호봉계산_설정;
}

console.log('✅ 호봉계산기_인사.js 로드 완료 (v4.0.0 API 연동 버전)');
