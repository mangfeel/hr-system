/**
 * AI도우미_인사.js - AI 인사 도우미 모듈
 * 
 * Gemini API를 활용한 인사 데이터 기반 AI 질의응답
 * - API 키 설정 및 연결 확인
 * - 사이드 패널 채팅 UI
 * - 민감정보 필터링 (주민번호, 급여, 계좌 등 제외)
 * 
 * @version 1.0.0
 * @since 2026-02-13
 * 
 * [변경 이력]
 * v1.0.0 (2026-02-13) - 최초 구현
 *   - Gemini API 연동
 *   - AI 설정 화면 (API 키 발급 가이드)
 *   - 사이드 패널 채팅
 *   - 민감정보 자동 필터링
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 */

// ===== AI 도우미 상수 =====

const AI_CONFIG = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    STORAGE_KEY: 'hr_ai_api_key',
    MAX_HISTORY: 20,
    SYSTEM_PROMPT: `당신은 사회복지시설 인사관리 도우미입니다.

[역할]
- 직원 정보, 조직 현황, 인사 관련 질문에 답변합니다.
- 제공된 직원 데이터만 기반으로 답변하세요.
- 데이터에 없는 내용은 "해당 정보가 없습니다"라고 답변하세요.

[중요: 인원수 답변 규칙]
- "현재 재직자 수", "전체 직원 수" 등을 물으면 반드시 [조직 정보]에 표기된 숫자를 그대로 사용하세요.
- 직원 목록을 직접 세지 마세요. [조직 정보]의 숫자가 정확한 집계입니다.
- 특정 조건(부서별, 성별 등)의 인원수를 물으면 해당 통계 섹션의 숫자를 사용하세요.

[중요: 미리 계산된 통계 사용 규칙]
- [월별 호봉승급자], [부서별 재직자], [재직자 성비], [재직자 연령대 분포] 섹션이 제공됩니다.
- 이 섹션의 데이터는 시스템이 정확하게 계산한 결과이므로, 반드시 이 데이터를 그대로 사용하세요.
- "2월 호봉승급자는?" → [월별 호봉승급자]의 2월 목록을 그대로 답변하세요. 직접 목록을 검색하지 마세요.
- "부서별 인원은?" → [부서별 재직자]를 그대로 답변하세요.
- "성비는?" → [재직자 성비]를 그대로 답변하세요.
- "연령대 분포는?" → [재직자 연령대 분포]를 그대로 답변하세요.

[기준일 조회 - 재직 여부]
- "YYYY년 MM월 DD일 기준 재직자"를 질문하면, 해당 날짜에 입사일 이후이고 퇴직일이 없거나 퇴직일이 해당 날짜 이후인 직원을 재직자로 판단하세요.
- 예: 입사일 2020-01-01, 퇴직일 2025-06-30인 직원은 2025-03-01 기준 재직자이고, 2025-07-01 기준으로는 퇴직자입니다.

[기준일 조회 - 직위/부서 (발령이력 활용)]
- 특정 시점의 직위나 부서를 질문하면, 반드시 발령이력을 확인하세요.
- 발령이력은 발령일 순서로 나열됩니다. 각 발령은 해당 발령일부터 다음 발령일 전날까지 유효합니다.
- 특정 날짜의 직위를 찾으려면: 발령일이 해당 날짜 이전이면서 가장 최근인 발령의 직위가 그 시점의 직위입니다.
- 예: 발령이력이 [2020-01-01: 사무국장, 2023-07-01: 관장]인 경우
  - 2022-02-01 기준 직위 = 사무국장 (2020-01-01 발령이 유효)
  - 2024-01-01 기준 직위 = 관장 (2023-07-01 발령이 유효)
- "현재" 직위/부서와 "과거 특정 시점" 직위/부서는 다를 수 있으므로 반드시 발령이력 날짜를 비교하세요.
- 발령이력이 없는 직원은 현재 직위를 사용하세요.

[호봉 승급 조회]
- 호봉승급자 질문 시 반드시 [월별 호봉승급자] 섹션의 목록을 그대로 답변하세요.
- "2026년 2월 호봉승급자" → [월별 호봉승급자]의 "2월" 항목을 그대로 사용하세요.
- 직원 목록에서 직접 찾지 마세요. 미리 계산된 목록이 정확합니다.

[성별/연령 분석]
- 각 직원의 나이(만 나이)와 연령대가 제공됩니다. 생년월일은 제공되지 않습니다.
- "30대 직원은?" 질문 시 연령대가 "30대"인 직원만 정확히 필터링하세요.
- 통계/집계 질문(성비, 연령대별 분포 등)에는 데이터를 활용하여 답변하세요.
- 개별 직원의 나이를 직접 답변하지 마세요. "30대", "40대" 등 연령대로만 답변하세요.

[제한사항]
- 주민등록번호, 생년월일, 급여, 계좌번호, 주소, 연락처 등 민감정보는 제공되지 않습니다.
- 개별 직원의 성별, 나이를 직접 답변하지 마세요. 통계/집계 용도로만 사용하세요.
- 민감정보나 개인정보를 묻는 질문에는 "개인정보 보호를 위해 해당 정보는 제공할 수 없습니다"라고 답변하세요.

[답변 스타일]
- 한국어로 간결하고 친절하게 답변하세요.
- 표나 목록이 필요하면 간단한 텍스트 형태로 정리하세요.
- 존댓말을 사용하세요.`
};

// ===== 상태 변수 =====

let aiChatHistory = [];
let aiIsLoading = false;

// ===== API 키 관리 =====

/**
 * 저장된 API 키 불러오기
 * @returns {string|null}
 */
function _getAIApiKey() {
    try {
        if (typeof window.electronStore !== 'undefined') {
            // Electron 환경: 비동기이므로 localStorage 우선 사용
            return localStorage.getItem(AI_CONFIG.STORAGE_KEY);
        }
        return localStorage.getItem(AI_CONFIG.STORAGE_KEY);
    } catch (e) {
        return null;
    }
}

/**
 * API 키 저장
 * @param {string} key
 */
function _saveAIApiKey(key) {
    try {
        localStorage.setItem(AI_CONFIG.STORAGE_KEY, key);
        // Electron 환경에서는 electron-store에도 저장
        if (typeof window.electronStore !== 'undefined') {
            window.electronStore.set(AI_CONFIG.STORAGE_KEY, key);
        }
    } catch (e) {
        로거_인사?.error('AI API 키 저장 실패', e);
    }
}

/**
 * API 키 삭제
 */
function _removeAIApiKey() {
    try {
        localStorage.removeItem(AI_CONFIG.STORAGE_KEY);
        if (typeof window.electronStore !== 'undefined') {
            window.electronStore.delete(AI_CONFIG.STORAGE_KEY);
        }
    } catch (e) {
        로거_인사?.error('AI API 키 삭제 실패', e);
    }
}

// ===== 민감정보 필터링 =====

/**
 * 생년월일로 만 나이 계산
 * @param {string} birthDate - 생년월일 (YYYY-MM-DD)
 * @returns {number|null} 만 나이
 */
function _calculateAge(birthDate) {
    if (!birthDate) return null;
    try {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    } catch (e) {
        return null;
    }
}

/**
 * 생년월일로 연령대 계산
 * @param {string} birthDate - 생년월일 (YYYY-MM-DD)
 * @returns {string} 연령대 (20대, 30대 등)
 */
function _getAgeGroup(birthDate) {
    const age = _calculateAge(birthDate);
    if (age === null) return '';
    if (age < 20) return '10대';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    if (age < 50) return '40대';
    if (age < 60) return '50대';
    return '60대 이상';
}

/**
 * 직원의 현재 호봉을 동적으로 계산
 * @param {Object} employee - 직원 객체
 * @returns {number|null} 현재 호봉
 */
function _calculateCurrentRank(employee) {
    try {
        if (!employee.rank?.firstUpgradeDate || 
            employee.rank.firstUpgradeDate === '-' ||
            employee.rank.firstUpgradeDate === '') {
            return null;
        }
        
        if (employee.employment?.isRankBased === false && employee.rank?.isRankBased !== true) return null;
        
        const today = typeof DateUtils !== 'undefined' 
            ? DateUtils.formatDate(new Date()) 
            : new Date().toISOString().split('T')[0];
        
        if (typeof RankCalculator !== 'undefined' && RankCalculator.calculateCurrentRank) {
            const rank = RankCalculator.calculateCurrentRank(
                employee.rank.startRank,
                employee.rank.firstUpgradeDate,
                today
            );
            return rank;
        }
        
        return employee.rank?.currentRank || null;
    } catch (e) {
        return employee.rank?.currentRank || null;
    }
}

/**
 * 직원의 매년 승급 월/일을 추출
 * @param {Object} employee - 직원 객체
 * @returns {string|null} 승급월일 (예: "2월 1일")
 */
function _getUpgradeMonthDay(employee) {
    try {
        if (!employee.rank?.firstUpgradeDate || 
            employee.rank.firstUpgradeDate === '-' ||
            employee.rank.firstUpgradeDate === '') {
            return null;
        }
        
        if (employee.employment?.isRankBased === false && employee.rank?.isRankBased !== true) return null;
        
        const parts = employee.rank.firstUpgradeDate.split('-');
        if (parts.length < 3) return null;
        
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${month}월 ${day}일`;
    } catch (e) {
        return null;
    }
}

/**
 * 직원 데이터에서 민감정보 제거
 * @param {Object} employee - 원본 직원 데이터
 * @returns {Object} 필터링된 데이터
 */
function _sanitizeEmployeeForAI(employee) {
    if (!employee) return null;
    
    // 재직 상태 판단 (직원유틸_인사와 동일 로직)
    let employmentStatus = '재직';
    let retirementDate = null;
    
    if (typeof 직원유틸_인사 !== 'undefined') {
        // 시스템 유틸 함수 사용 (가장 정확)
        employmentStatus = 직원유틸_인사.getEmploymentStatus(employee);
        retirementDate = 직원유틸_인사.getRetirementDate(employee);
    } else {
        // 폴백: 직접 판단
        if (employee.employment?.status) {
            employmentStatus = employee.employment.status;
        } else {
            retirementDate = employee.employment?.retirementDate || employee.retirementDate || null;
            if (retirementDate) employmentStatus = '퇴사';
        }
    }
    
    const isRetired = employmentStatus === '퇴사';
    
    const result = {
        이름: employee.personalInfo?.name || '(이름없음)',
        사원번호: employee.uniqueCode || '',
        성별: employee.personalInfo?.gender || '',
        나이: _calculateAge(employee.personalInfo?.birthDate),
        연령대: _getAgeGroup(employee.personalInfo?.birthDate),
        부서: employee.employment?.dept || '',
        직위: employee.employment?.position || '',
        직급: employee.employment?.grade || '',
        직종: employee.employment?.jobType || '',
        입사일: employee.employment?.entryDate || '',
        고용형태: employee.employment?.employmentType || '',
        호봉제여부: (employee.employment?.isRankBased || employee.rank?.isRankBased) ? '호봉제' : '연봉제',
        현재호봉: _calculateCurrentRank(employee),
        매년승급일: _getUpgradeMonthDay(employee),
        경력연수: employee.career?.totalYears || 0,
        경력개월: employee.career?.totalMonths || 0,
        재직상태: isRetired ? '퇴직' : '재직',
        퇴직일: retirementDate,
        휴직상태: employee.maternityLeave?.isOnLeave ? '휴직중' : null,
        주당근무시간: employee.employment?.weeklyWorkingHours || 40
        // 주민번호, 급여, 계좌번호, 주소, 연락처 제외
    };
    
    // 발령이력
    if (employee.assignments && employee.assignments.length > 0) {
        result.발령이력 = employee.assignments.map(a => {
            const item = { 발령일: a.startDate || '' };
            if (a.dept) item.부서 = a.dept;
            if (a.position) item.직위 = a.position;
            if (a.grade) item.직급 = a.grade;
            if (a.employmentType) item.고용형태 = a.employmentType;
            item.상태 = a.status === 'active' ? '현재' : '종료';
            return item;
        });
    }
    
    // 과거경력
    if (employee.careerDetails && employee.careerDetails.length > 0) {
        result.과거경력 = employee.careerDetails.map(c => ({
            기관명: c.name || '',
            시작일: c.startDate || '',
            종료일: c.endDate || '',
            근무기간: c.period || ''
        }));
    }
    
    return result;
}

/**
 * 전체 직원 데이터를 필터링하여 AI 컨텍스트 생성
 * @returns {string} AI에 전달할 컨텍스트 문자열
 */
function _buildAIContext() {
    try {
        if (typeof db === 'undefined' || !db) return '(직원 데이터 없음)';
        
        const employees = db.getEmployees();
        if (!employees || employees.length === 0) return '(등록된 직원이 없습니다)';
        
        const sanitized = employees.map(emp => _sanitizeEmployeeForAI(emp));
        const activeCount = sanitized.filter(e => e.재직상태 === '재직').length;
        const retiredCount = sanitized.filter(e => e.재직상태 === '퇴직').length;
        
        // 조직명
        const orgName = db.data?.settings?.organizationName || '(조직명 미설정)';
        
        let context = `[조직 정보] (정확한 집계 - 이 숫자를 신뢰하세요)\n`;
        context += `조직명: ${orgName}\n`;
        context += `전체 직원: ${employees.length}명\n`;
        context += `현재 재직자: ${activeCount}명 (정확한 수치)\n`;
        context += `퇴직자: ${retiredCount}명 (정확한 수치)\n`;
        context += `오늘 날짜: ${new Date().toISOString().split('T')[0]}\n\n`;
        
        // === 미리 계산된 통계 (AI가 직접 세지 않도록) ===
        const activeEmps = sanitized.filter(e => e.재직상태 === '재직');
        
        // 월별 호봉승급자
        const upgradeByMonth = {};
        activeEmps.forEach(e => {
            if (e.호봉제여부 === '호봉제' && e.매년승급일) {
                const match = e.매년승급일.match(/(\d+)월/);
                if (match) {
                    const month = parseInt(match[1], 10);
                    if (!upgradeByMonth[month]) upgradeByMonth[month] = [];
                    upgradeByMonth[month].push(e.이름);
                }
            }
        });
        
        context += `[월별 호봉승급자] (정확한 목록 - 이 목록을 그대로 사용하세요)\n`;
        for (let m = 1; m <= 12; m++) {
            if (upgradeByMonth[m]) {
                context += `${m}월: ${upgradeByMonth[m].join(', ')} (${upgradeByMonth[m].length}명)\n`;
            }
        }
        context += `\n`;
        
        // 부서별 재직자 수
        const deptCount = {};
        activeEmps.forEach(e => {
            const dept = e.부서 || '(미지정)';
            deptCount[dept] = (deptCount[dept] || 0) + 1;
        });
        
        context += `[부서별 재직자]\n`;
        Object.entries(deptCount).sort((a, b) => b[1] - a[1]).forEach(([dept, count]) => {
            context += `${dept}: ${count}명\n`;
        });
        context += `\n`;
        
        // 성별 통계
        const genderCount = { '남': 0, '여': 0 };
        activeEmps.forEach(e => {
            if (e.성별 === '남' || e.성별 === '여') genderCount[e.성별]++;
        });
        context += `[재직자 성비] 남: ${genderCount['남']}명, 여: ${genderCount['여']}명\n`;
        
        // 연령대 통계
        const ageGroupCount = {};
        activeEmps.forEach(e => {
            if (e.연령대) {
                ageGroupCount[e.연령대] = (ageGroupCount[e.연령대] || 0) + 1;
            }
        });
        context += `[재직자 연령대 분포]\n`;
        ['20대', '30대', '40대', '50대', '60대 이상'].forEach(ag => {
            if (ageGroupCount[ag]) context += `${ag}: ${ageGroupCount[ag]}명\n`;
        });
        context += `\n`;
        
        context += `[직원 목록]\n`;
        
        sanitized.forEach((emp, idx) => {
            context += `${idx + 1}. ${emp.이름}`;
            if (emp.성별) context += ` | 성별: ${emp.성별}`;
            if (emp.나이) context += ` | 만${emp.나이}세(${emp.연령대})`;
            context += ` | ${emp.부서} | ${emp.직위}`;
            if (emp.직급) context += ` | ${emp.직급}`;
            if (emp.현재호봉) context += ` | ${emp.현재호봉}호봉`;
            context += ` | 입사일: ${emp.입사일}`;
            context += ` | ${emp.고용형태}`;
            context += ` | ${emp.재직상태}`;
            if (emp.퇴직일) context += ` | 퇴직일: ${emp.퇴직일}`;
            if (emp.휴직상태) context += ` | ${emp.휴직상태}`;
            if (emp.매년승급일) context += ` | 매년승급: ${emp.매년승급일}`;
            context += `\n`;
            
            // 발령이력
            if (emp.발령이력 && emp.발령이력.length > 0) {
                context += `  [발령이력]\n`;
                emp.발령이력.forEach(a => {
                    context += `    - ${a.발령일}: ${a.부서 || ''} ${a.직위 || ''} ${a.직급 || ''} (${a.상태})\n`;
                });
            }
            
            // 과거경력
            if (emp.과거경력 && emp.과거경력.length > 0) {
                context += `  [과거경력]\n`;
                emp.과거경력.forEach(c => {
                    context += `    - ${c.기관명}: ${c.시작일}~${c.종료일} (${c.근무기간})\n`;
                });
            }
        });
        
        // 포상이력 (별도 저장소)
        if (typeof awardsManager !== 'undefined') {
            try {
                const allAwards = awardsManager.getAll();
                if (allAwards && allAwards.length > 0) {
                    context += `\n[포상이력] (총 ${allAwards.length}건)\n`;
                    allAwards.forEach(a => {
                        context += `- ${a.name || ''}`;
                        if (a.type) context += ` | 구분: ${a.type}`;
                        if (a.awardName) context += ` | 내역: ${a.awardName}`;
                        if (a.awardDate) context += ` | 수상일: ${a.awardDate}`;
                        if (a.honor) context += ` | 훈격: ${a.honor}`;
                        if (a.organization) context += ` | 주관처: ${a.organization}`;
                        if (a.selected) context += ` | 선정: ${a.selected}`;
                        context += `\n`;
                    });
                }
            } catch (e) {
                // 포상 데이터 로드 실패 시 무시
            }
        }
        
        return context;
    } catch (error) {
        로거_인사?.error('AI 컨텍스트 생성 실패', error);
        return '(데이터 로드 중 오류 발생)';
    }
}

// ===== Gemini API 호출 =====

/**
 * Gemini API에 질문 전송 (자동 재시도 포함)
 * @param {string} question - 사용자 질문
 * @returns {Promise<string>} AI 응답
 */
async function _askGemini(question) {
    const apiKey = _getAIApiKey();
    if (!apiKey) {
        return '[주의] AI API 키가 설정되지 않았습니다.\n시스템 > AI 도우미 설정에서 API 키를 입력해주세요.';
    }
    
    const context = _buildAIContext();
    
    // 대화 이력 구성
    const contents = [];
    
    // 이전 대화 이력 추가 (최근 10개)
    const recentHistory = aiChatHistory.slice(-10);
    recentHistory.forEach(msg => {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        });
    });
    
    // 현재 질문 (컨텍스트 포함)
    const userMessage = `[직원 데이터]\n${context}\n\n[질문]\n${question}`;
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });
    
    const requestBody = JSON.stringify({
        systemInstruction: {
            parts: [{ text: AI_CONFIG.SYSTEM_PROMPT }]
        },
        contents: contents,
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096
        }
    });
    
    // 최대 3회 재시도 (429 에러 시)
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(`${AI_CONFIG.API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody
            });
            
            if (response.ok) {
                const data = await response.json();
                const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!aiText) {
                    return '[주의] AI가 응답을 생성하지 못했습니다. 다시 시도해주세요.';
                }
                return aiText;
            }
            
            if (response.status === 429) {
                if (attempt < 3) {
                    // 재시도 대기 (5초, 15초)
                    const waitSec = attempt * 5 + Math.floor(Math.random() * 5);
                    console.log(`[AI도우미] 429 에러 - ${waitSec}초 후 재시도 (${attempt}/3)`);
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                    continue;
                }
                return '[주의] API 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.';
            }
            
            if (response.status === 400 || response.status === 403) {
                return '[주의] API 키가 올바르지 않습니다. 설정에서 다시 확인해주세요.';
            }
            
            return `[주의] API 오류가 발생했습니다. (${response.status})`;
            
        } catch (error) {
            로거_인사?.error('Gemini API 호출 실패', error);
            if (error.message?.includes('fetch')) {
                return '[주의] 인터넷 연결을 확인해주세요.';
            }
            return '[주의] AI 응답 중 오류가 발생했습니다.';
        }
    }
}

// ===== AI 설정 화면 =====

/**
 * AI 설정 모듈 로드
 */
function loadAISettingsModule() {
    const apiKey = _getAIApiKey();
    const hasKey = apiKey && apiKey.length > 0;
    
    // 상태 표시 업데이트
    const statusEl = document.getElementById('ai-connection-status');
    const keyInput = document.getElementById('ai-api-key-input');
    
    if (statusEl) {
        if (hasKey) {
            statusEl.innerHTML = '<span style="color:#10b981;font-weight:600;">[연결됨]</span>';
        } else {
            statusEl.innerHTML = '<span style="color:#ef4444;font-weight:600;">[미연결]</span>';
        }
    }
    
    if (keyInput && hasKey) {
        keyInput.value = apiKey.substring(0, 10) + '••••••••••••';
    }
}

/**
 * API 키 연결 확인 (키 형식 검증 + 저장)
 * API 호출 횟수 절약을 위해 실제 API 호출 없이 형식만 확인
 */
async function testAIConnection() {
    const keyInput = document.getElementById('ai-api-key-input');
    const statusEl = document.getElementById('ai-connection-status');
    const testBtn = document.getElementById('ai-test-btn');
    
    if (!keyInput || !keyInput.value.trim()) {
        에러처리_인사?.warn('API 키를 입력해주세요.');
        return;
    }
    
    let apiKey = keyInput.value.trim();
    
    // 마스킹된 키면 저장된 키 사용
    if (apiKey.includes('••••')) {
        apiKey = _getAIApiKey();
        if (!apiKey) {
            에러처리_인사?.warn('API 키를 다시 입력해주세요.');
            return;
        }
    }
    
    // 키 형식 검증 (AIza로 시작, 39자)
    if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444;font-weight:600;">[연결 실패] - API 키 형식이 올바르지 않습니다</span>';
        에러처리_인사?.warn('API 키는 AIza...로 시작하는 문자열이어야 합니다.');
        return;
    }
    
    // 키 저장
    _saveAIApiKey(apiKey);
    if (statusEl) statusEl.innerHTML = '<span style="color:#10b981;font-weight:600;">[연결 성공]</span>';
    에러처리_인사?.success('API 키가 저장되었습니다. 상단의 AI 버튼을 클릭하여 사용하세요.');
    _updateAIButtonState();
}

/**
 * API 키 삭제
 */
function removeAIApiKey() {
    if (!confirm('API 키를 삭제하시겠습니까?\nAI 도우미 기능이 비활성화됩니다.')) return;
    
    _removeAIApiKey();
    
    const keyInput = document.getElementById('ai-api-key-input');
    const statusEl = document.getElementById('ai-connection-status');
    
    if (keyInput) keyInput.value = '';
    if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444;font-weight:600;">[미연결]</span>';
    
    _updateAIButtonState();
    에러처리_인사?.info('API 키가 삭제되었습니다.');
}

// ===== 사이드 패널 (채팅) =====

/**
 * AI 패널 토글
 */
function toggleAIPanel() {
    const panel = document.getElementById('ai-chat-panel');
    if (!panel) return;
    
    const isOpen = panel.classList.contains('open');
    
    if (isOpen) {
        panel.classList.remove('open');
    } else {
        const apiKey = _getAIApiKey();
        if (!apiKey) {
            에러처리_인사?.info('AI 도우미를 사용하려면 먼저 API 키를 설정해주세요.');
            navigateToModule('ai-settings');
            return;
        }
        panel.classList.add('open');
        const input = document.getElementById('ai-chat-input');
        if (input) setTimeout(() => input.focus(), 300);
    }
}

/**
 * 상단 AI 버튼 상태 업데이트
 */
function _updateAIButtonState() {
    const btn = document.getElementById('ai-toggle-btn');
    if (!btn) return;
    
    const hasKey = !!_getAIApiKey();
    if (hasKey) {
        btn.style.opacity = '1';
        btn.style.background = '#f0f0ff';
        btn.style.borderColor = '#c7d2fe';
        btn.title = 'AI 도우미 열기';
    } else {
        btn.style.opacity = '0.4';
        btn.style.background = '#f9fafb';
        btn.style.borderColor = '#e5e7eb';
        btn.title = 'AI 도우미 (시스템 > AI 도우미 설정에서 API 키를 먼저 등록하세요)';
    }
}

/**
 * 채팅 메시지 전송
 */
async function sendAIMessage() {
    const input = document.getElementById('ai-chat-input');
    const messagesEl = document.getElementById('ai-chat-messages');
    
    if (!input || !messagesEl) return;
    
    const question = input.value.trim();
    if (!question) return;
    if (aiIsLoading) return;
    
    // 사용자 메시지 표시
    _appendChatMessage('user', question);
    aiChatHistory.push({ role: 'user', text: question });
    input.value = '';
    
    // 로딩 표시
    aiIsLoading = true;
    const loadingId = _appendChatMessage('loading', '');
    
    // AI 응답 요청
    const response = await _askGemini(question);
    
    // 로딩 제거 & 응답 표시
    _removeChatMessage(loadingId);
    _appendChatMessage('ai', response);
    aiChatHistory.push({ role: 'model', text: response });
    
    // 이력 제한
    if (aiChatHistory.length > AI_CONFIG.MAX_HISTORY) {
        aiChatHistory = aiChatHistory.slice(-AI_CONFIG.MAX_HISTORY);
    }
    
    aiIsLoading = false;
}

/**
 * 채팅 메시지 추가
 * @param {string} type - 'user' | 'ai' | 'loading'
 * @param {string} text
 * @returns {string} 메시지 ID
 */
function _appendChatMessage(type, text) {
    const messagesEl = document.getElementById('ai-chat-messages');
    if (!messagesEl) return '';
    
    const msgId = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.id = msgId;
    div.className = `ai-chat-msg ai-chat-${type}`;
    
    if (type === 'loading') {
        div.innerHTML = '<div class="ai-chat-bubble ai-bubble-ai"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
    } else if (type === 'user') {
        div.innerHTML = `<div class="ai-chat-bubble ai-bubble-user">${_escapeHtml(text)}</div>`;
    } else {
        div.innerHTML = `<div class="ai-chat-bubble ai-bubble-ai">${_formatAIResponse(text)}</div>`;
    }
    
    messagesEl.appendChild(div);
    // DOM 렌더 완료 후 스크롤 (긴 응답에서도 확실하게)
    requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    });
    
    return msgId;
}

/**
 * 채팅 메시지 제거
 * @param {string} msgId
 */
function _removeChatMessage(msgId) {
    const el = document.getElementById(msgId);
    if (el) el.remove();
}

/**
 * AI 응답 포맷팅 (줄바꿈 처리)
 * @param {string} text
 * @returns {string} HTML
 */
function _formatAIResponse(text) {
    return _escapeHtml(text)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

/**
 * HTML 이스케이프
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * 채팅 이력 초기화
 */
function clearAIChat() {
    aiChatHistory = [];
    const messagesEl = document.getElementById('ai-chat-messages');
    if (messagesEl) {
        messagesEl.innerHTML = `
            <div class="ai-chat-msg ai-chat-ai">
                <div class="ai-chat-bubble ai-bubble-ai">
                    안녕하세요! 인사관리 AI 도우미입니다.<br>
                    직원 정보, 조직 현황 등을 질문해주세요.<br><br>
                    <span style="color:#9ca3af;font-size:12px;">예) "김철수 현재 호봉은?", "올해 퇴직 예정자 알려줘"</span>
                </div>
            </div>
        `;
    }
}

/**
 * Enter 키 전송 처리
 * @param {KeyboardEvent} event
 */
function handleAIChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAIMessage();
    }
}

/**
 * Google AI Studio 열기
 */
function openAIStudio() {
    const url = 'https://aistudio.google.com/apikey';
    // Electron 환경에서는 openInBrowser 사용, 아니면 window.open
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.openInBrowser) {
        // 간단한 HTML로 리다이렉트
        const html = `<html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body></body></html>`;
        window.electronAPI.openInBrowser(html, 'ai_studio_redirect.html');
    } else {
        window.open(url, '_blank');
    }
}

// ===== 초기화 =====

// 앱 시작 시 AI 버튼 상태 업데이트
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(_updateAIButtonState, 1000);
});

console.log('[AI도우미] AI도우미_인사.js 로드됨 (v1.0.0)');
