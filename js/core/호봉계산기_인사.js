/**
 * 호봉계산기_인사.js - API 전용 버전
 * 
 * 호봉 및 경력 계산 로직 (서버 API 전용)
 * - 모든 계산은 서버 API 호출
 * - 계산 로직 클라이언트에서 완전히 숨김
 * 
 * @version 5.0.0
 * @since 2024-11-04
 * 
 * [변경 이력]
 * v5.0.0 (2026-01-22) ⭐ API 전용 버전
 *   - 모든 Calculator를 API 호출로 변경
 *   - 로컬 계산 로직 완전 제거
 *   - 계산 공식 보호 (F12에서 안 보임)
 * 
 * v4.0.0 (2026-01-21) API 연동 버전
 *   - 로컬 계산 유지 (기존 100% 호환)
 *   - API 호출 함수 추가 (*Async 버전)
 */

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

// ===== 근속기간 계산기 (API 전용) =====

const TenureCalculator = {
    
    /**
     * 두 날짜 사이의 기간 계산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculate(startDate, endDate) {
        try {
            if (typeof API_인사 !== 'undefined') {
                return await API_인사.calculateTenure(startDate, endDate);
            }
            // API 없으면 기본값 반환
            console.error('❌ API_인사 모듈이 없습니다. 근속기간 계산 불가.');
            return { years: 0, months: 0, days: 0 };
        } catch (error) {
            console.error('근속기간 계산 API 호출 실패', error);
            return { years: 0, months: 0, days: 0 };
        }
    },
    
    /**
     * 동기 버전 (하위 호환용 - 경고만 표시)
     * @deprecated API_인사.calculateTenure() 또는 TenureCalculator.calculate() 사용
     */
    calculateSync(startDate, endDate) {
        console.warn('⚠️ TenureCalculator.calculateSync()는 더 이상 지원되지 않습니다.');
        return { years: 0, months: 0, days: 0 };
    },
    
    format(tenure) {
        try {
            if (!tenure) return '0년 0개월 0일';
            return `${tenure.years || 0}년 ${tenure.months || 0}개월 ${tenure.days || 0}일`;
        } catch (error) {
            return '0년 0개월 0일';
        }
    }
};

// ===== 호봉 계산기 (API 전용) =====

const RankCalculator = {
    
    /**
     * 초기 호봉 계산 (간단한 계산이라 로컬 유지)
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
     * 첫승급일 계산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays) {
        try {
            if (typeof API_인사 !== 'undefined') {
                return await API_인사.calculateFirstUpgradeDate(entryDate, careerYears, careerMonths, careerDays);
            }
            console.error('❌ API_인사 모듈이 없습니다. 첫승급일 계산 불가.');
            const entry = DateUtils.parseDate(entryDate);
            return `${entry.year + 1}-${String(entry.month).padStart(2, '0')}-01`;
        } catch (error) {
            console.error('첫승급일 계산 API 호출 실패', error);
            const entry = DateUtils.parseDate(entryDate);
            return `${entry.year + 1}-${String(entry.month).padStart(2, '0')}-01`;
        }
    },
    
    /**
     * 현재 호봉 계산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculateCurrentRank(startRank, firstUpgradeDate, baseDate) {
        try {
            if (typeof API_인사 !== 'undefined') {
                return await API_인사.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
            }
            console.error('❌ API_인사 모듈이 없습니다. 현재 호봉 계산 불가.');
            return startRank || 1;
        } catch (error) {
            console.error('현재 호봉 계산 API 호출 실패', error);
            return startRank || 1;
        }
    },
    
    /**
     * 차기승급일 계산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculateNextUpgradeDate(firstUpgradeDate, baseDate) {
        try {
            if (typeof API_인사 !== 'undefined') {
                return await API_인사.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
            }
            console.error('❌ API_인사 모듈이 없습니다. 차기승급일 계산 불가.');
            return firstUpgradeDate || '';
        } catch (error) {
            console.error('차기승급일 계산 API 호출 실패', error);
            return firstUpgradeDate || '';
        }
    },
    
    /**
     * 통합 호봉 계산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculate(entryDate, firstUpgradeDate, startRank, baseDate) {
        try {
            // 인자가 emp 객체인 경우 처리 (인사카드용)
            if (typeof entryDate === 'object' && entryDate.employment) {
                const emp = entryDate;
                baseDate = firstUpgradeDate; // 두 번째 인자가 baseDate
                entryDate = emp.employment?.entryDate || '';
                firstUpgradeDate = emp.rank?.firstUpgradeDate || '';
                startRank = emp.rank?.startRank || 1;
            }
            
            const currentGrade = await this.calculateCurrentRank(startRank, firstUpgradeDate, baseDate);
            const nextUpgradeDate = await this.calculateNextUpgradeDate(firstUpgradeDate, baseDate);
            
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
    }
};

// ===== 경력 계산기 (API 전용) =====

const CareerCalculator = {
    
    STANDARD_WORKING_HOURS: 40,
    
    /**
     * 경력 환산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async applyConversionRate(period, rate, workingHours = 40) {
        try {
            if (typeof API_인사 !== 'undefined') {
                return await API_인사.applyConversionRate(period, rate, workingHours);
            }
            console.error('❌ API_인사 모듈이 없습니다. 경력 환산 불가.');
            return { years: 0, months: 0, days: 0 };
        } catch (error) {
            console.error('경력 환산 API 호출 실패', error);
            return { years: 0, months: 0, days: 0 };
        }
    },
    
    /**
     * 전체 경력 합산 (API 호출)
     * ⭐ v5.0.0: 서버 API 전용
     */
    async calculateTotalCareer(careers) {
        try {
            if (!careers || careers.length === 0) {
                return { totalYears: 0, totalMonths: 0, totalDays: 0, convertedYears: 0, convertedMonths: 0, convertedDays: 0 };
            }
            
            let totalDays = 0;
            
            for (const career of careers) {
                if (!career.startDate || !career.endDate) continue;
                
                // TenureCalculator.calculate도 이제 async
                const period = await TenureCalculator.calculate(career.startDate, career.endDate);
                const rate = career.rate ?? career.conversionRate ?? 100;
                const workingHours = career.workingHours ?? 40;
                
                const converted = await this.applyConversionRate(period, rate, workingHours);
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
    
    getWorkingHoursRate(workingHours) {
        const hours = Math.min(40, Math.max(1, workingHours || 40));
        return hours / 40;
    },
    
    formatWorkingHoursPercent(workingHours) {
        const rate = this.getWorkingHoursRate(workingHours);
        return `${(rate * 100).toFixed(0)}%`;
    }
};

// ===== 현 기관 경력 계산기 (API 전용) =====

const InternalCareerCalculator = {
    
    /**
     * 발령별 인정율 적용하여 현 기관 경력 계산
     * ⭐ v5.0.0: async로 변경 (TenureCalculator.calculate가 async)
     */
    async calculateWithPriorCareerRate(emp, baseDate) {
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
                
                // ⭐ v5.0.0: await 추가
                const period = await TenureCalculator.calculate(periodStart, effectiveEnd);
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
