/**
 * 복원가져오기_인사.js - 프로덕션급 리팩토링
 * 
 * 데이터 복원 및 가져오기 기능
 * - HRM 보안 백업 파일 복원 (압축 + 인코딩) ⭐ v4.0 추가
 * - JSON 백업 파일 복원 (전체 데이터 + 시스템 설정) - 레거시 지원
 * - Excel 파일에서 직원 정보 가져오기
 * - Excel 날짜 변환 유틸리티
 * - 발령 데이터 자동 마이그레이션 ⭐ v3.5 추가
 * 
 * @version 4.3
 * @since 2024-11-05
 * 
 * [변경 이력]
 * v4.3 - 복원 결과 메시지 한글화 (2026-01-30)
 *   - 시스템 설정 복원 결과 메시지에서 영어 키 이름을 한글로 변환
 *   - salaryGrades → 직급 관리, salaryTables → 급여표 등
 * 
 * v4.2 - 엑셀 가져오기 호봉 숫자 변환 수정 (2026-01-30)
 *   - startRank, currentRank를 parseInt()로 숫자 변환
 *   - 문자열 "1" → 숫자 1 로 저장하여 호봉 계산 오류 방지
 *   - 기존: "1" + 1 + yearDiff = "112" (문자열 연결 버그)
 *   - 수정: 1 + 1 + yearDiff = 정상 호봉 계산
 * 
 * v4.1 - 디코딩 헤더 구조 개선 (2026-01-30)
 *   - v4.1 헤더(12자리): 청크개수(6) + 원본길이(6)
 *   - v4.0 헤더(6자리) 레거시 호환 유지
 *   - 마지막 청크가 16자 미만일 때 복원 오류 수정
 *   - 백업_인사.js v4.1과 호환
 * 
 * v4.0 - 보안 백업 형식 지원 (2026-01-29)
 *   - .hrm 파일 복원 지원 (압축 + 인코딩)
 *   - .json 파일도 레거시로 계속 지원
 *   - _decodeBackupData() 함수 추가
 *   - 파일 확장자에 따른 자동 처리
 * 
 * v3.5 - 발령 데이터 자동 마이그레이션 (2025-12-10)
 *   - 복원 시 구버전 발령 데이터 자동 변환
 *   - id: 숫자 → 문자열 (assign-timestamp)
 *   - code: 없으면 생성 (고유번호-순번 패턴)
 *   - startDate: 없으면 date에서 복사
 *   - status: 없으면 자동 설정 (active/ended)
 *   - _migrateAssignmentData() 함수 추가
 * 
 * v3.4 - 누락된 설정 키 추가 (2025-12-08)
 *   - hr_position_allowances (직책수당 금액 설정)
 *   - hr_salary_basic_settings (급여 기본 설정) - KEYS에 누락되어 있던 것 추가
 * 
 * v3.3 - 급여 기본 설정 복원 추가 (2025-12-02)
 *   - hr_salary_basic_settings (급여 기준일, 직무대리 지급 설정)
 * 
 * v3.2 - 급여 설정 복원 추가 (2025-12-02)
 *   - 직급 관리 (연도별) 복원 추가
 *   - 급여표 (연도별) 복원 추가
 *   - 급여 설정 (직책수당, 명절휴가비) 복원 추가
 * 
 * v3.1 - 전체 시스템 데이터 복원
 *   - 겸직/직무대리 설정 복원 추가
 *   - 조직도 설정 복원 추가
 *   - 근속현황표 특수부서 설정 복원 추가
 *   - 구버전(v3.1 이전) 백업 파일 호환
 * 
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (로거, 에러처리, 상수)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - 코드 정리 및 주석 추가
 *   - 함수 분리 (가독성 향상)
 *   - 검증 강화
 *   - 진행 상황 표시
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 함수 유지
 * - 구버전 백업 파일(.json)도 복원 가능
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 호봉계산기_인사.js (DateUtils)
 * - 상수_인사.js (CONFIG_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - XLSX (SheetJS) - Excel 가져오기
 * 
 * [중요 사항]
 * - Excel 가져오기 시 과거 경력은 포함되지 않음
 * - 완벽한 복원은 HRM 또는 JSON 백업 사용 권장
 */

// ===== 시스템 설정 키 정의 =====

/**
 * 복원에 사용할 시스템 설정 키 목록
 * @constant {Object}
 */
const RESTORE_SYSTEM_KEYS = {
    // 조직 관련
    concurrentPositions: 'hr_concurrent_positions',     // 겸직/직무대리
    orgChartSettings: 'hr_org_chart_settings',          // 조직도 설정
    
    // 보고서 관련
    tenureSpecialDepts: 'tenureReport_specialDepts',    // 근속현황표 특수부서
    
    // 포상 관련
    awardsData: 'hr_awards_data',                        // 포상 데이터
    
    // 급여 설정 관련 (v3.2 추가)
    salaryGrades: 'hr_salary_grades',                    // 직급 관리 (연도별)
    salaryTables: 'hr_salary_tables',                    // 급여표 (연도별)
    salarySettings: 'hr_salary_settings',                // 급여 설정 (직책수당, 명절휴가비)
    ordinaryWageSettings: 'hr_ordinary_wage_settings',   // 통상임금 설정
    
    // 급여 설정 관련 (v3.4 추가)
    positionAllowances: 'hr_position_allowances',        // 직책수당 금액 설정 (연도별)
    salaryBasicSettings: 'hr_salary_basic_settings',     // 급여 기본 설정 (기준일, 직무대리 지급)
    
    // 시간외근무 관련 (v3.6 추가)
    overtimeSettings: 'hr_overtime_settings',            // 시간외근무 유형 설정
    overtimeRecords: 'hr_overtime_records'               // 시간외근무 기록 (연월별)
};

// ===== v4.0: 보안 디코딩 함수 =====

// BACKUP_FILE_HEADER는 백업_인사.js에서 이미 선언됨
// const BACKUP_FILE_HEADER = 'HRM_SECURE_BACKUP_V4';

/**
 * 백업 데이터 디코딩 (Private)
 * 
 * @private
 * @param {string} encoded - 인코딩된 문자열
 * @returns {Object} 복원된 데이터 객체
 * 
 * @description
 * 인코딩된 백업 데이터를 원래 JSON 객체로 복원합니다.
 */
function _decodeBackupData(encoded) {
    try {
        // v4.0 형식 (6자리 헤더) vs v4.1 형식 (12자리 헤더) 감지
        // v4.1: 헤더 12자리 = 청크개수(6) + 원본길이(6)
        // v4.0: 헤더 6자리 = 청크개수만
        
        const chunkSize = 16;
        let chunkCount, originalLength, shuffled;
        
        // 헤더 형식 감지: v4.1은 12자리, v4.0은 6자리
        // v4.1 형식인지 확인 (원본길이가 유효한 숫자인지)
        const possibleOriginalLength = parseInt(encoded.substring(6, 12), 10);
        const possibleChunkCount = parseInt(encoded.substring(0, 6), 10);
        
        // v4.1 형식 검증: 청크개수 * 16 >= 원본길이 > (청크개수-1) * 16
        const isV41Format = !isNaN(possibleOriginalLength) && 
                           possibleOriginalLength > 0 &&
                           possibleChunkCount * chunkSize >= possibleOriginalLength &&
                           possibleOriginalLength > (possibleChunkCount - 1) * chunkSize;
        
        if (isV41Format) {
            // v4.1 형식: 12자리 헤더
            chunkCount = possibleChunkCount;
            originalLength = possibleOriginalLength;
            shuffled = encoded.substring(12);
        } else {
            // v4.0 형식: 6자리 헤더 (레거시 호환)
            chunkCount = parseInt(encoded.substring(0, 6), 10);
            shuffled = encoded.substring(6);
            // 원본 길이 추정 (마지막 청크가 16자라고 가정)
            originalLength = shuffled.length;
        }
        
        // 마지막 청크 크기 계산
        const lastChunkSize = originalLength % chunkSize || chunkSize;
        
        // 홀수/짝수 청크 개수 계산
        const oddCount = Math.floor(chunkCount / 2);
        const evenCount = chunkCount - oddCount;
        
        // 홀수 청크들의 총 길이 계산 (인덱스 1, 3, 5, ...)
        let oddTotalLength = 0;
        for (let i = 1; i < chunkCount; i += 2) {
            if (i === chunkCount - 1) {
                oddTotalLength += lastChunkSize;
            } else {
                oddTotalLength += chunkSize;
            }
        }
        
        const oddPart = shuffled.substring(0, oddTotalLength);
        const evenPart = shuffled.substring(oddTotalLength);
        
        // 홀수 청크 분리 (인덱스 1, 3, 5, ...)
        const oddChunks = [];
        let pos = 0;
        for (let i = 1; i < chunkCount; i += 2) {
            const size = (i === chunkCount - 1) ? lastChunkSize : chunkSize;
            oddChunks.push(oddPart.substring(pos, pos + size));
            pos += size;
        }
        
        // 짝수 청크 분리 (인덱스 0, 2, 4, ...)
        const evenChunks = [];
        pos = 0;
        for (let i = 0; i < chunkCount; i += 2) {
            const size = (i === chunkCount - 1) ? lastChunkSize : chunkSize;
            evenChunks.push(evenPart.substring(pos, pos + size));
            pos += size;
        }
        
        // 원래 순서로 복원
        const restored = [];
        let evenIdx = 0, oddIdx = 0;
        for (let i = 0; i < chunkCount; i++) {
            if (i % 2 === 0) {
                restored.push(evenChunks[evenIdx++]);
            } else {
                restored.push(oddChunks[oddIdx++]);
            }
        }
        const reversed = restored.join('');
        
        // 바이트 순서 원복
        const base64 = reversed.split('').reverse().join('');
        
        // Base64 → UTF-8 디코딩
        const jsonStr = decodeURIComponent(escape(atob(base64)));
        
        // JSON 파싱
        return JSON.parse(jsonStr);
        
    } catch (error) {
        로거_인사?.error('백업 데이터 디코딩 오류', error);
        throw error;
    }
}

// ===== JSON/HRM 복원 =====

/**
 * 백업 파일 복원 (JSON 또는 HRM)
 * 
 * @param {File} file - 복원할 백업 파일 (.hrm 또는 .json)
 * 
 * @description
 * 백업 파일에서 전체 데이터를 복원합니다.
 * - .hrm 파일: 보안 인코딩 해제 후 복원 (v4.0+)
 * - .json 파일: 기존 방식으로 복원 (레거시 지원)
 * - 기존 데이터 완전 대체
 * - 모든 정보 100% 복원 (과거 경력 포함)
 * - 시스템 설정도 함께 복원 (v3.2+ 백업 파일)
 * - 구버전 백업 파일도 호환
 * - 복원 후 페이지 자동 새로고침
 * 
 * @example
 * // HTML: <input type="file" accept=".hrm,.json" onchange="restoreFromJSON(this.files[0])">
 * restoreFromJSON(file);
 * 
 * @throws {인사에러} 파일이 없거나 형식이 잘못된 경우
 */
function restoreFromJSON(file) {
    try {
        로거_인사?.debug('백업 복원 시작', { filename: file?.name });
        
        // 파일 확인
        if (!file) {
            로거_인사?.warn('복원 파일이 없습니다');
            에러처리_인사?.warn('파일을 선택해주세요.');
            return;
        }
        
        // 파일 확장자 확인
        const fileName = file.name.toLowerCase();
        const isHrmFile = fileName.endsWith('.hrm');
        const isJsonFile = fileName.endsWith('.json');
        
        if (!isHrmFile && !isJsonFile) {
            로거_인사?.warn('지원하지 않는 파일 형식', { filename: file.name });
            에러처리_인사?.warn('지원하지 않는 파일 형식입니다.\n.hrm 또는 .json 파일을 선택해주세요.');
            return;
        }
        
        // 사용자 확인
        const fileTypeLabel = isHrmFile ? '보안 백업' : 'JSON 백업';
        const confirmMessage = 
            `⚠️ 경고: 데이터 복원\n\n` +
            `파일: ${file.name}\n` +
            `형식: ${fileTypeLabel}\n` +
            `크기: ${_formatFileSize(file.size)}\n\n` +
            `기존 데이터가 모두 대체됩니다.\n` +
            `(직원 데이터 + 시스템 설정 모두 복원)\n\n` +
            `진행하시겠습니까?`;
        
        if (!confirm(confirmMessage)) {
            로거_인사?.info('백업 복원 취소');
            _clearFileInput('restoreFile');
            return;
        }
        
        // FileReader로 파일 읽기
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                로거_인사?.debug('백업 파일 읽기 완료');
                
                const fileContent = e.target.result;
                let rawData;
                
                // ⭐ v4.0: 파일 형식에 따른 처리
                if (isHrmFile) {
                    // .hrm 파일: 헤더 확인 후 디코딩
                    const lines = fileContent.split('\n');
                    const header = lines[0];
                    
                    if (header !== BACKUP_FILE_HEADER) {
                        throw new Error('올바른 HRM 백업 파일이 아닙니다.');
                    }
                    
                    const encodedData = lines.slice(1).join('');
                    rawData = _decodeBackupData(encodedData);
                    로거_인사?.debug('HRM 보안 백업 디코딩 완료');
                    
                } else {
                    // .json 파일: 기존 방식
                    rawData = JSON.parse(fileContent);
                    로거_인사?.debug('JSON 백업 파싱 완료');
                }
                
                // 백업 버전 확인 (v3.2+ 또는 구버전)
                const isNewFormat = rawData._backupInfo && rawData.database;
                
                // 데이터베이스 데이터 추출
                const dbData = isNewFormat ? rawData.database : rawData;
                
                // 데이터 검증
                if (!_validateBackupData(dbData)) {
                    throw new Error('올바른 백업 파일이 아닙니다.');
                }
                
                // ⭐ v3.5: 발령 데이터 마이그레이션
                const migrationResult = _migrateAssignmentData(dbData);
                로거_인사?.debug('발령 데이터 마이그레이션', migrationResult);
                
                // 1. 데이터베이스 복원
                const storageKey = (typeof CONFIG_인사 !== 'undefined')
                    ? CONFIG_인사.STORAGE_KEY
                    : 'hr_system_v25_db';
                
                localStorage.setItem(storageKey, JSON.stringify(dbData));
                로거_인사?.debug('데이터베이스 복원 완료');
                
                // 2. 시스템 설정 복원 (v3.2+ 백업만)
                let settingsRestored = [];
                if (isNewFormat && rawData.systemSettings) {
                    Object.entries(RESTORE_SYSTEM_KEYS).forEach(([key, storageKey]) => {
                        try {
                            if (rawData.systemSettings[key]) {
                                localStorage.setItem(storageKey, JSON.stringify(rawData.systemSettings[key]));
                                settingsRestored.push(key);
                                로거_인사?.debug(`시스템 설정 복원: ${key}`);
                            }
                        } catch (err) {
                            로거_인사?.warn(`시스템 설정 복원 실패: ${key}`, err);
                        }
                    });
                }
                
                로거_인사?.info('백업 복원 완료', {
                    employeeCount: dbData.employees?.length || 0,
                    settingsRestored: settingsRestored,
                    backupVersion: rawData._backupInfo?.version || '구버전',
                    backupType: isHrmFile ? 'HRM 보안' : 'JSON',
                    migrationResult: migrationResult
                });
                
                // 복원 결과 메시지 구성
                const settingsInfo = settingsRestored.length > 0
                    ? `\n\n📋 시스템 설정 복원:\n• ${settingsRestored.map(k => {
                        switch(k) {
                            case 'concurrentPositions': return '겸직/직무대리';
                            case 'orgChartSettings': return '조직도 설정';
                            case 'tenureSpecialDepts': return '근속현황표 특수부서';
                            case 'awardsData': return '포상 데이터';
                            case 'salaryGrades': return '직급 관리';
                            case 'salaryTables': return '급여표';
                            case 'salarySettings': return '급여 설정';
                            case 'ordinaryWageSettings': return '통상임금 설정';
                            case 'positionAllowances': return '직책수당 설정';
                            case 'salaryBasicSettings': return '급여 기본 설정';
                            case 'overtimeSettings': return '시간외근무 설정';
                            case 'overtimeRecords': return '시간외근무 기록';
                            default: return k;
                        }
                    }).join('\n• ')}`
                    : (isNewFormat ? '' : '\n\n(구버전 백업 파일 - 시스템 설정 없음)');
                
                // ⭐ v3.5: 마이그레이션 정보
                const migrationInfo = migrationResult.migratedCount > 0
                    ? `\n\n🔄 발령 데이터 마이그레이션: ${migrationResult.migratedCount}건`
                    : '';
                
                alert(
                    `✅ 복원 완료!\n\n` +
                    `파일 형식: ${isHrmFile ? 'HRM 보안 백업' : 'JSON 백업'}\n` +
                    `직원 수: ${dbData.employees?.length || 0}명` +
                    settingsInfo +
                    migrationInfo +
                    `\n\n페이지를 새로고침합니다.`
                );
                
                // 페이지 새로고침
                location.reload();
                
            } catch (error) {
                로거_인사?.error('백업 복원 오류', error);
                에러처리_인사?.handle(error, '백업 파일 복원 중 오류가 발생했습니다.');
                _clearFileInput('restoreFile');
            }
        };
        
        reader.onerror = function(error) {
            로거_인사?.error('파일 읽기 오류', error);
            에러처리_인사?.handle(error, '파일을 읽을 수 없습니다.');
            _clearFileInput('restoreFile');
        };
        
        // 파일 읽기 시작
        reader.readAsText(file);
        
    } catch (error) {
        로거_인사?.error('백업 복원 시작 오류', error);
        에러처리_인사?.handle(error, '복원을 시작할 수 없습니다.');
        _clearFileInput('restoreFile');
    }
}

/**
 * 백업 데이터 검증 (Private)
 * 
 * @private
 * @param {Object} data - 백업 데이터
 * @returns {boolean} 유효 여부
 * 
 * @description
 * JSON 백업 파일의 데이터 구조를 검증합니다.
 */
function _validateBackupData(data) {
    try {
        // 필수 속성 확인
        if (!data || typeof data !== 'object') {
            로거_인사?.warn('데이터가 객체가 아닙니다');
            return false;
        }
        
        if (!data.employees || !Array.isArray(data.employees)) {
            로거_인사?.warn('employees 배열이 없습니다');
            return false;
        }
        
        if (!data.settings || typeof data.settings !== 'object') {
            로거_인사?.warn('settings 객체가 없습니다');
            return false;
        }
        
        로거_인사?.debug('백업 데이터 검증 성공', {
            employeeCount: data.employees.length
        });
        
        return true;
        
    } catch (error) {
        로거_인사?.error('백업 데이터 검증 오류', error);
        return false;
    }
}

// ===== Excel 가져오기 =====

/**
 * Excel 파일에서 직원 정보 가져오기
 * 
 * @param {File} file - 가져올 Excel 파일
 * 
 * @description
 * Excel 파일에서 직원 정보를 읽어와 시스템에 추가합니다.
 * - "직원정보" 시트 필요
 * - 고유번호별로 그룹화
 * - 발령 이력 자동 구성
 * - 최대 고유번호 자동 업데이트
 * 
 * ⚠️ 주의: 과거 경력은 포함되지 않음
 * 
 * @example
 * // HTML: <input type="file" onchange="importFromGoogleSheets(this.files[0])">
 * importFromGoogleSheets(file);
 * 
 * @throws {인사에러} 파일이 없거나 형식이 잘못된 경우
 */
function importFromGoogleSheets(file) {
    try {
        로거_인사?.debug('Excel 가져오기 시작', { filename: file?.name });
        
        // 파일 확인
        if (!file) {
            로거_인사?.warn('가져올 파일이 없습니다');
            에러처리_인사?.warn('파일을 선택해주세요.');
            return;
        }
        
        // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            로거_인사?.error('XLSX 라이브러리를 찾을 수 없습니다');
            에러처리_인사?.warn('Excel 라이브러리를 찾을 수 없습니다.');
            return;
        }
        
        // DB 확인
        if (typeof db === 'undefined' || !db) {
            로거_인사?.error('DB를 찾을 수 없습니다');
            에러처리_인사?.warn('데이터베이스를 찾을 수 없습니다.');
            return;
        }
        
        // FileReader로 파일 읽기
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                로거_인사?.debug('Excel 파일 읽기 완료');
                
                // Excel 워크북 읽기
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                
                // "직원정보" 시트 찾기
                const ws = wb.Sheets['직원정보'];
                
                if (!ws) {
                    로거_인사?.warn('"직원정보" 시트를 찾을 수 없습니다');
                    에러처리_인사?.warn('"직원정보" 시트를 찾을 수 없습니다.\n시트 이름을 확인해주세요.');
                    _clearFileInputs(['googleImportFile', 'googleImportFile2']);
                    return;
                }
                
                // 시트를 JSON으로 변환
                const rows = XLSX.utils.sheet_to_json(ws);
                
                로거_인사?.info('Excel 데이터 읽기 완료', { rowCount: rows.length });
                
                // 직원 데이터 생성
                const employees = _buildEmployeesFromExcel(rows);
                
                if (employees.length === 0) {
                    로거_인사?.warn('가져올 직원 데이터가 없습니다');
                    에러처리_인사?.warn('가져올 데이터가 없습니다.');
                    _clearFileInputs(['googleImportFile', 'googleImportFile2']);
                    return;
                }
                
                // 사용자 확인
                const confirmMessage = 
                    `📊 Excel 데이터 가져오기\n\n` +
                    `파일: ${file.name}\n` +
                    `직원 수: ${employees.length}명\n` +
                    `원본 행 수: ${rows.length}행\n\n` +
                    `⚠️ 주의: 과거 경력은 포함되지 않습니다.\n\n` +
                    `진행하시겠습니까?`;
                
                if (!confirm(confirmMessage)) {
                    로거_인사?.info('Excel 가져오기 취소');
                    _clearFileInputs(['googleImportFile', 'googleImportFile2']);
                    return;
                }
                
                // 데이터베이스에 저장
                _saveImportedEmployees(employees);
                
                로거_인사?.info('Excel 가져오기 완료', { 
                    employeeCount: employees.length 
                });
                
                에러처리_인사?.success(
                    `✅ 가져오기 완료!\n\n` +
                    `${employees.length}명의 직원 데이터를 가져왔습니다.`
                );
                
                // 파일 입력 초기화
                _clearFileInputs(['googleImportFile', 'googleImportFile2']);
                
                // UI 업데이트
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
                if (typeof loadEmployeeList === 'function') {
                    loadEmployeeList();
                }
                
            } catch (error) {
                로거_인사?.error('Excel 가져오기 오류', error);
                에러처리_인사?.handle(error, 'Excel 파일 가져오기 중 오류가 발생했습니다.');
                _clearFileInputs(['googleImportFile', 'googleImportFile2']);
            }
        };
        
        reader.onerror = function(error) {
            로거_인사?.error('파일 읽기 오류', error);
            에러처리_인사?.handle(error, '파일을 읽을 수 없습니다.');
            _clearFileInputs(['googleImportFile', 'googleImportFile2']);
        };
        
        // 파일 읽기 시작
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        로거_인사?.error('Excel 가져오기 시작 오류', error);
        에러처리_인사?.handle(error, 'Excel 가져오기를 시작할 수 없습니다.');
        _clearFileInputs(['googleImportFile', 'googleImportFile2']);
    }
}

/**
 * Excel 데이터에서 직원 객체 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} rows - Excel 행 데이터
 * @returns {Array<Object>} 직원 객체 배열
 * 
 * @description
 * Excel 행 데이터를 직원 객체로 변환합니다.
 * - 고유번호별로 그룹화
 * - 발령 이력 구성
 * - 최신 정보 기준으로 현재 직책 설정
 */
function _buildEmployeesFromExcel(rows) {
    try {
        const uniqueEmployees = {};
        
        // 1. 고유번호별로 그룹화
        rows.forEach(row => {
            const id = row['고유번호'];
            if (!id) {
                로거_인사?.debug('고유번호 없는 행 건너뜀', { row });
                return;
            }
            
            if (!uniqueEmployees[id]) {
                uniqueEmployees[id] = [];
            }
            uniqueEmployees[id].push(row);
        });
        
        const employees = [];
        
        // 2. 각 직원별로 데이터 구성
        for (const [uniqueCode, assignments] of Object.entries(uniqueEmployees)) {
            try {
                const employee = _createEmployeeFromAssignments(uniqueCode, assignments);
                employees.push(employee);
            } catch (error) {
                로거_인사?.warn('직원 데이터 생성 오류', { 
                    uniqueCode, 
                    error 
                });
            }
        }
        
        로거_인사?.debug('직원 객체 생성 완료', { 
            uniqueCount: Object.keys(uniqueEmployees).length,
            employeeCount: employees.length 
        });
        
        return employees;
        
    } catch (error) {
        로거_인사?.error('Excel 데이터 변환 오류', error);
        return [];
    }
}

/**
 * 발령 데이터에서 직원 객체 생성 (Private)
 * 
 * @private
 * @param {string} uniqueCode - 고유번호
 * @param {Array<Object>} assignments - 발령 행 데이터
 * @returns {Object} 직원 객체
 * 
 * @description
 * 같은 고유번호의 여러 발령 데이터를 하나의 직원 객체로 생성합니다.
 */
function _createEmployeeFromAssignments(uniqueCode, assignments) {
    try {
        // 발령 이력을 날짜순으로 정렬 (최신순)
        const sortedAssignments = assignments.sort((a, b) => {
            const dateA = excelDateToJS(a['인사발령일']);
            const dateB = excelDateToJS(b['인사발령일']);
            return new Date(dateB) - new Date(dateA);
        });
        
        // 최신 발령 정보 (현재 정보)
        const latest = sortedAssignments[0];
        
        // 직원 객체 생성
        const employee = {
            id: `EMP${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
            uniqueCode: uniqueCode,
            employeeNumber: latest['사원번호'] || uniqueCode,
            
            personalInfo: {
                name: latest['성명'] || '',
                residentNumber: latest['주민등록번호'] || '',
                birthDate: excelDateToJS(latest['생년월일']) || '',
                gender: latest['성별'] || ''
            },
            
            currentPosition: {
                dept: latest['부서명'] || '',
                position: latest['직위'] || '',
                grade: latest['직급'] || '',
                jobType: latest['직종'] || ''
            },
            
            certifications: _extractCertifications(latest),
            
            employment: {
                type: latest['고용형태'] || '정규직',
                entryDate: excelDateToJS(latest['입사일']) || '',
                retirementDate: excelDateToJS(latest['퇴사일']) || null,
                status: latest['근무상태'] || '재직'
            },
            
            rank: {
                startRank: parseInt(latest['입사 호봉'] || latest['입사호봉']) || 1,
                firstUpgradeDate: excelDateToJS(latest['첫승급년월일']) || null,
                currentRank: parseInt(latest['현재호봉']) || 1,
                isRankBased: !!(excelDateToJS(latest['첫승급년월일']))
            },
            
            assignments: _createAssignmentHistory(sortedAssignments, uniqueCode),
            
            maternityLeave: {
                isOnLeave: latest['육아휴직 여부'] === '예',
                startDate: excelDateToJS(latest['출산휴가 및 육아휴직 시작일']) || null,
                endDate: excelDateToJS(latest['출산휴가 및 육아휴직 종료일']) || null,
                history: []
            },
            
            contactInfo: {
                phone: latest['전화번호'] || '',
                address: latest['주소'] || '',
                email: latest['이메일'] || ''
            },
            
            careerDetails: []  // ⚠️ Excel에는 과거 경력 없음
        };
        
        return employee;
        
    } catch (error) {
        로거_인사?.error('직원 객체 생성 오류', { uniqueCode, error });
        throw error;
    }
}

/**
 * 자격증 추출 (Private)
 * 
 * @private
 * @param {Object} row - Excel 행 데이터
 * @returns {Array<Object>} 자격증 배열
 */
function _extractCertifications(row) {
    try {
        const certifications = [];
        
        if (row['자격증1(급)']) {
            certifications.push({
                id: `CERT${Date.now()}-1`,
                name: row['자격증1(급)']
            });
        }
        
        if (row['자격증2(급)']) {
            certifications.push({
                id: `CERT${Date.now()}-2`,
                name: row['자격증2(급)']
            });
        }
        
        return certifications;
        
    } catch (error) {
        로거_인사?.warn('자격증 추출 오류', error);
        return [];
    }
}

/**
 * 발령 이력 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} sortedAssignments - 정렬된 발령 데이터
 * @param {string} uniqueCode - 고유번호
 * @returns {Array<Object>} 발령 이력 배열
 */
function _createAssignmentHistory(sortedAssignments, uniqueCode) {
    try {
        return sortedAssignments.map((assign, idx) => ({
            id: `ASSIGN${Date.now()}-${idx}`,
            code: assign['발령코드'] || `${uniqueCode}-${String(idx + 1).padStart(2, '0')}`,
            startDate: excelDateToJS(assign['인사발령일']) || '',
            endDate: excelDateToJS(assign['인사발령종료일']) || null,
            dept: assign['부서명'] || '',
            position: assign['직위'] || '',
            grade: assign['직급'] || '',
            status: (assign['근무상태'] === '재직') ? 'active' : 'completed'
        }));
    } catch (error) {
        로거_인사?.warn('발령 이력 생성 오류', error);
        return [];
    }
}

/**
 * 가져온 직원 데이터 저장 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 객체 배열
 * 
 * @description
 * 가져온 직원 데이터를 데이터베이스에 저장합니다.
 * - 최대 고유번호 업데이트
 * - 각 직원 저장
 */
function _saveImportedEmployees(employees) {
    try {
        로거_인사?.debug('직원 데이터 저장 시작', { count: employees.length });
        
        // 최대 고유번호 찾기
        let maxNum = db.data.settings.nextUniqueCodeNumber - 1;
        
        employees.forEach(emp => {
            try {
                // 고유번호에서 숫자 추출 (H001 → 1)
                const num = parseInt(emp.uniqueCode.replace(/[^0-9]/g, ''));
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            } catch (error) {
                로거_인사?.warn('고유번호 파싱 오류', { 
                    uniqueCode: emp.uniqueCode, 
                    error 
                });
            }
        });
        
        // 다음 고유번호 업데이트
        db.data.settings.nextUniqueCodeNumber = maxNum + 1;
        
        로거_인사?.debug('다음 고유번호 업데이트', { 
            nextNumber: db.data.settings.nextUniqueCodeNumber 
        });
        
        // 각 직원 저장
        employees.forEach(emp => {
            try {
                db.saveEmployee(emp);
            } catch (error) {
                로거_인사?.error('직원 저장 오류', { 
                    employee: emp.uniqueCode, 
                    error 
                });
            }
        });
        
        로거_인사?.info('직원 데이터 저장 완료', { count: employees.length });
        
    } catch (error) {
        로거_인사?.error('직원 데이터 저장 오류', error);
        throw error;
    }
}

// ===== Excel 날짜 변환 =====

/**
 * Excel 날짜 변환 유틸리티
 * 
 * @param {number|string|null} excelDate - Excel 날짜 (숫자 또는 문자열)
 * @returns {string|null} YYYY-MM-DD 형식 날짜 또는 null
 * 
 * @description
 * Excel의 날짜 형식을 JavaScript 날짜 문자열로 변환합니다.
 * - 숫자: Excel 날짜 시리얼 번호
 * - 문자열: YYYY-MM-DD 형식 확인
 * - null/undefined: null 반환
 * 
 * @example
 * excelDateToJS(44927) // "2023-01-01"
 * excelDateToJS("2023-01-01") // "2023-01-01"
 * excelDateToJS(null) // null
 */
function excelDateToJS(excelDate) {
    try {
        // null/undefined 처리
        if (!excelDate) {
            return null;
        }
        
        // 문자열 형태의 날짜
        if (typeof excelDate === 'string') {
            // YYYY-MM-DD 형식 확인
            if (excelDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return excelDate;
            }
            // 다른 형식은 그대로 반환
            return excelDate;
        }
        
        // Excel 날짜 숫자
        if (typeof excelDate === 'number') {
            // Excel 시리얼 날짜 변환
            // Excel 기준일: 1900-01-01 = 1
            // JavaScript 기준일: 1970-01-01
            // 차이: 25569일
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            
            // DateUtils 사용 (있으면)
            if (typeof DateUtils !== 'undefined' && DateUtils.formatDate) {
                return DateUtils.formatDate(date);
            }
            
            // 수동 포맷
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
        
        로거_인사?.warn('알 수 없는 날짜 형식', { excelDate });
        return null;
        
    } catch (error) {
        로거_인사?.warn('날짜 변환 오류', { excelDate, error });
        return null;
    }
}

// ===== 발령 데이터 마이그레이션 =====

/**
 * 발령 데이터 마이그레이션 (Private)
 * 
 * @private
 * @param {Object} dbData - 데이터베이스 데이터
 * @returns {Object} 마이그레이션 결과 { migratedCount, details }
 * 
 * @description
 * 구버전 발령 데이터를 새 구조로 마이그레이션합니다.
 * - id: 숫자 → 문자열 (assign-timestamp-idx)
 * - code: 없으면 생성 (고유번호-순번 패턴, 예: H105-01)
 * - startDate: 없으면 date에서 복사
 * - status: 없으면 자동 설정 (마지막=active, 나머지=ended)
 * 
 * @since v3.5 (2025-12-10)
 */
function _migrateAssignmentData(dbData) {
    const result = {
        migratedCount: 0,
        details: []
    };
    
    try {
        if (!dbData.employees || !Array.isArray(dbData.employees)) {
            return result;
        }
        
        dbData.employees.forEach(emp => {
            if (!emp.assignments || !Array.isArray(emp.assignments) || emp.assignments.length === 0) {
                return;
            }
            
            const uniqueCode = emp.uniqueCode || 'H000';
            
            emp.assignments.forEach((assign, idx) => {
                let migrated = false;
                
                // 1. id가 숫자인 경우 → 문자열로 변환
                if (typeof assign.id === 'number') {
                    assign.id = `assign-${Date.now()}-${idx}`;
                    migrated = true;
                }
                
                // 2. code가 없고 type만 있는 경우 → code 생성
                if (!assign.code && assign.type) {
                    const assignNum = String(idx + 1).padStart(2, '0');
                    assign.code = `${uniqueCode}-${assignNum}`;
                    migrated = true;
                }
                
                // 3. startDate가 없고 date만 있는 경우 → startDate 추가
                if (!assign.startDate && assign.date) {
                    assign.startDate = assign.date;
                    migrated = true;
                }
                
                // 4. status가 없는 경우 → 자동 설정
                if (!assign.status) {
                    const isLast = idx === emp.assignments.length - 1;
                    assign.status = isLast ? 'active' : 'ended';
                    migrated = true;
                }
                
                if (migrated) {
                    result.migratedCount++;
                    result.details.push({
                        employee: emp.personalInfo?.name || uniqueCode,
                        assignmentCode: assign.code
                    });
                }
            });
        });
        
        로거_인사?.info('발령 데이터 마이그레이션 완료', result);
        return result;
        
    } catch (error) {
        로거_인사?.error('발령 데이터 마이그레이션 오류', error);
        return result;
    }
}

// ===== 유틸리티 함수 =====

/**
 * 파일 입력 초기화 (Private)
 * 
 * @private
 * @param {string} inputId - 입력 요소 ID
 * 
 * @description
 * 파일 입력 요소의 값을 초기화합니다.
 */
function _clearFileInput(inputId) {
    try {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    } catch (error) {
        로거_인사?.warn('파일 입력 초기화 오류', { inputId, error });
    }
}

/**
 * 여러 파일 입력 초기화 (Private)
 * 
 * @private
 * @param {Array<string>} inputIds - 입력 요소 ID 배열
 * 
 * @description
 * 여러 파일 입력 요소의 값을 초기화합니다.
 */
function _clearFileInputs(inputIds) {
    try {
        inputIds.forEach(id => _clearFileInput(id));
    } catch (error) {
        로거_인사?.warn('파일 입력들 초기화 오류', error);
    }
}

/**
 * 파일 크기 포맷 (Private)
 * 
 * @private
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 크기 문자열
 * 
 * @description
 * 바이트를 읽기 쉬운 형식으로 변환합니다.
 * 
 * @example
 * _formatFileSize(1024) // "1.00 KB"
 * _formatFileSize(1048576) // "1.00 MB"
 */
function _formatFileSize(bytes) {
    try {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        
    } catch (error) {
        로거_인사?.warn('파일 크기 포맷 오류', error);
        return bytes + ' Bytes';
    }
}
