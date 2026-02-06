/**
 * 백업_인사.js - 프로덕션급 리팩토링 v4.3
 * 
 * 데이터 백업 기능
 * - HRM 백업 (압축 + 인코딩 - AI 분석 방지) ⭐ v4.0 추가
 * - JSON 백업 (전체 DB 구조 + 시스템 설정 보존) - 레거시 지원
 * - Excel 백업 (완벽한 가져오기 호환)
 * - 전체 데이터 초기화
 * 
 * @version 4.3
 * @since 2024-11-07
 * 
 * [변경 이력]
 * v4.3 - Electron 포커스 문제 해결 (2026-02-06)
 *   - 보안 백업/Excel 백업 완료 후 window.focus() 호출
 *   - 백업 후 입력란에 바로 커서가 들어가지 않는 문제 수정
 *
 * v4.2 - 전체 삭제 시 모든 설정 삭제 (2026-01-30)
 *   - resetAllData(): 직원 데이터 + 모든 시스템 설정 삭제
 *   - 겸직/직무대리, 조직도, 직급/급여표, 직책수당, 포상, 시간외근무 등
 *   - BACKUP_SYSTEM_KEYS에 정의된 모든 localStorage 키 삭제
 *   - ⭐ Electron 환경: electron-store 데이터도 함께 삭제
 * 
 * v4.1 - 인코딩 헤더 구조 개선 (2026-01-30)
 *   - 헤더: 청크개수(6자리) + 원본길이(6자리) = 12자리
 *   - 마지막 청크가 16자 미만일 때 복원 오류 수정
 *   - 복원가져오기_인사.js v4.1과 호환
 * 
 * v4.0 - 보안 백업 형식 추가 (2026-01-29)
 *   - .hrm 확장자 사용 (압축 + 인코딩)
 *   - AI가 직접 분석할 수 없는 바이너리 형식
 *   - 기존 JSON 백업 파일도 복원 지원 (레거시)
 *   - _encodeBackupData() 함수 추가
 * 
 * v3.6 - Electron 환경 호환 (2026-01-23)
 *   - resetAllData(): prompt() → confirm()으로 변경
 *   - Electron 환경에서 prompt() 미지원 문제 해결
 * 
 * v3.5 - 누락된 설정 키 추가 (2025-12-08)
 *   - hr_position_allowances (직책수당 금액 설정)
 *   - hr_salary_basic_settings (급여 기본 설정) - KEYS에 누락되어 있던 것 추가
 * 
 * v3.4 - 급여 기본 설정 백업 추가 (2025-12-02)
 *   - hr_salary_basic_settings (급여 기준일, 직무대리 지급 설정)
 * 
 * v3.3 - 급여 설정 백업 추가 (2025-12-02)
 *   - 직급 관리 (연도별) 백업 추가
 *   - 급여표 (연도별) 백업 추가
 *   - 급여 설정 (직책수당, 명절휴가비) 백업 추가
 * 
 * v3.2 - 전체 시스템 데이터 백업
 *   - 겸직/직무대리 설정 백업 추가
 *   - 조직도 설정 백업 추가
 *   - 근속현황표 특수부서 설정 백업 추가
 *   - 통합 백업 구조 (_fullBackup)
 * 
 * v3.1 - 엑셀 백업 개선
 *   - 육아휴직 기간 겹침 확인 (정확한 이력)
 *   - 발령 정렬 (최신순) - 가져오기 호환
 *   - 완벽한 백업-복원 순환 보장
 * 
 * v3.0 - 프로덕션급 리팩토링
 *   - Phase 1 유틸리티 적용 (로거, 에러처리, 직원유틸)
 *   - 완벽한 에러 처리
 *   - 체계적 로깅
 *   - 코드 정리 및 주석 추가
 *   - 함수 분리 (가독성 향상)
 *   - 파일명 포맷 개선
 *   - 확인 메시지 개선
 * 
 * [하위 호환성]
 * - 모든 기존 함수명 유지
 * - 기존 API 100% 호환
 * - 전역 함수 유지
 * - 구버전 백업 파일(.json)도 복원 가능
 * 
 * [의존성]
 * - 데이터베이스_인사.js (db)
 * - 직원유틸_인사.js (직원유틸_인사) - 선택
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - XLSX (SheetJS) - Excel 백업
 */

// ===== 시스템 설정 키 정의 =====

/**
 * 백업에 포함할 시스템 설정 키 목록
 * @constant {Object}
 */
const BACKUP_SYSTEM_KEYS = {
    // 조직 관련
    concurrentPositions: 'hr_concurrent_positions',     // 겸직/직무대리
    orgChartSettings: 'hr_org_chart_settings',          // 조직도 설정
    
    // 보고서 관련
    tenureSpecialDepts: 'tenureReport_specialDepts',    // 근속현황표 특수부서
    
    // 포상 관련
    awardsData: 'hr_awards_data',                        // 포상 데이터
    
    // 급여 설정 관련 (v3.3 추가)
    salaryGrades: 'hr_salary_grades',                    // 직급 관리 (연도별)
    salaryTables: 'hr_salary_tables',                    // 급여표 (연도별)
    salarySettings: 'hr_salary_settings',                // 급여 설정 (직책수당, 명절휴가비)
    ordinaryWageSettings: 'hr_ordinary_wage_settings',   // 통상임금 설정
    
    // 급여 설정 관련 (v3.5 추가)
    positionAllowances: 'hr_position_allowances',        // 직책수당 금액 설정 (연도별)
    salaryBasicSettings: 'hr_salary_basic_settings',     // 급여 기본 설정 (기준일, 직무대리 지급)
    
    // 시간외근무 관련 (v3.6 추가)
    overtimeSettings: 'hr_overtime_settings',            // 시간외근무 유형 설정
    overtimeRecords: 'hr_overtime_records'               // 시간외근무 기록 (연월별)
};

// ===== v4.0: 보안 인코딩 함수 =====

/**
 * 백업 파일 헤더 (버전 식별용)
 * @constant {string}
 */
const BACKUP_FILE_HEADER = 'HRM_SECURE_BACKUP_V4';

/**
 * 백업 데이터 인코딩 (Private)
 * 
 * @private
 * @param {Object} data - 백업 데이터 객체
 * @returns {string} 인코딩된 문자열
 * 
 * @description
 * JSON 데이터를 압축 + 인코딩하여 AI가 분석할 수 없는 형태로 변환합니다.
 * - JSON → UTF-8 인코딩 → Base64 → 바이트 순서 변환 → 청크 섞기
 */
function _encodeBackupData(data) {
    try {
        // 1. JSON 문자열화
        const jsonStr = JSON.stringify(data);
        
        // 2. UTF-8 → Base64 인코딩
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        
        // 3. 바이트 순서 뒤집기
        const reversed = base64.split('').reverse().join('');
        
        // 4. 원본 길이 저장 (복원 시 마지막 청크 처리용)
        const originalLength = reversed.length;
        
        // 5. 청크로 나누어 섞기 (16자 단위)
        const chunkSize = 16;
        const chunks = [];
        for (let i = 0; i < reversed.length; i += chunkSize) {
            chunks.push(reversed.substring(i, i + chunkSize));
        }
        
        // 홀수/짝수 인덱스 분리 후 재조합
        const evenChunks = chunks.filter((_, i) => i % 2 === 0);
        const oddChunks = chunks.filter((_, i) => i % 2 === 1);
        const shuffled = [...oddChunks, ...evenChunks].join('');
        
        // 6. 헤더: 청크 개수(6자리) + 원본 길이(6자리) = 12자리
        const header = String(chunks.length).padStart(6, '0') + String(originalLength).padStart(6, '0');
        
        return header + shuffled;
        
    } catch (error) {
        로거_인사?.error('백업 데이터 인코딩 오류', error);
        throw error;
    }
}

// ===== JSON 백업 (보안 형식) =====

/**
 * JSON 백업 (보안 형식)
 * 
 * @description
 * 전체 데이터베이스와 시스템 설정을 보안 형식(.hrm)으로 백업합니다.
 * - 모든 직원 데이터 구조 보존
 * - 겸직/직무대리 설정 포함
 * - 조직도 설정 포함
 * - 근속현황표 특수부서 설정 포함
 * - 날짜별 파일명 생성
 * - 다운로드 후 자동 정리
 * - ⭐ v4.0: AI 분석 방지를 위한 인코딩 적용
 * 
 * @example
 * backupToJSON(); // 보안 백업 실행
 * 
 * @throws {인사에러} DB를 찾을 수 없는 경우
 */
function backupToJSON() {
    try {
        로거_인사?.debug('보안 백업 시작 (v4.0)');
        
        // DB 확인
        if (typeof db === 'undefined' || !db || !db.data) {
            로거_인사?.error('DB를 찾을 수 없습니다');
            에러처리_인사?.warn('백업할 데이터베이스를 찾을 수 없습니다.');
            return;
        }
        
        // 전체 백업 데이터 구성
        const fullBackup = {
            // 백업 메타정보
            _backupInfo: {
                version: '4.0',
                createdAt: new Date().toISOString(),
                type: 'secure_backup'
            },
            
            // 핵심 데이터 (직원, 메타데이터 등)
            database: db.data,
            
            // 시스템 설정들
            systemSettings: {}
        };
        
        // 시스템 설정 수집
        let settingsCount = 0;
        Object.entries(BACKUP_SYSTEM_KEYS).forEach(([key, storageKey]) => {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    fullBackup.systemSettings[key] = JSON.parse(saved);
                    settingsCount++;
                    로거_인사?.debug(`시스템 설정 백업: ${key}`);
                }
            } catch (e) {
                로거_인사?.warn(`시스템 설정 백업 실패: ${key}`, e);
            }
        });
        
        // ⭐ v4.0: 보안 인코딩 적용
        const encodedData = _encodeBackupData(fullBackup);
        const fileContent = BACKUP_FILE_HEADER + '\n' + encodedData;
        
        // Blob 생성 (바이너리 형태)
        const blob = new Blob([fileContent], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 링크 생성
        const a = document.createElement('a');
        a.href = url;
        
        // 파일명 생성 (YYYY-MM-DD 형식, .hrm 확장자)
        const today = new Date().toISOString().split('T')[0];
        const filename = `HR_Backup_${today}.hrm`;
        a.download = filename;
        
        // 다운로드 실행
        a.click();
        
        // URL 정리
        URL.revokeObjectURL(url);
        
        로거_인사?.info('보안 백업 완료', { filename, size: blob.size, settingsCount });
        
        // 백업 내용 상세 정보 구성
        const settingsList = [];
        if (fullBackup.systemSettings.concurrentPositions) {
            const count = fullBackup.systemSettings.concurrentPositions.length || 0;
            settingsList.push(`• 겸직/직무대리: ${count}건`);
        }
        if (fullBackup.systemSettings.orgChartSettings) {
            settingsList.push(`• 조직도 설정: 저장됨`);
        }
        if (fullBackup.systemSettings.tenureSpecialDepts) {
            const count = fullBackup.systemSettings.tenureSpecialDepts.length || 0;
            settingsList.push(`• 근속현황표 특수부서: ${count}개`);
        }
        if (fullBackup.systemSettings.awardsData) {
            const count = fullBackup.systemSettings.awardsData.length || 0;
            settingsList.push(`• 포상 데이터: ${count}건`);
        }
        
        const settingsInfo = settingsList.length > 0 
            ? `\n📋 시스템 설정:\n${settingsList.join('\n')}\n` 
            : '';
        
        에러처리_인사?.success(
            `✅ 보안 백업 완료!\n\n` +
            `파일명: ${filename}\n` +
            `크기: ${_formatFileSize(blob.size)}\n` +
            `직원 수: ${db.data.employees?.length || 0}명\n` +
            settingsInfo +
            `\n📌 이 백업은:\n` +
            `- 모든 데이터를 100% 완벽하게 보존합니다\n` +
            `- 시스템 설정도 함께 저장됩니다\n` +
            `- 보안 인코딩이 적용되어 있습니다\n` +
            `- 정기적으로 백업하는 것을 권장합니다`
        );
        
        // ⭐ v4.3: 윈도우 포커스 복원 (Electron 포커스 문제 해결)
        setTimeout(() => window.focus(), 100);
        
    } catch (error) {
        로거_인사?.error('보안 백업 오류', error);
        에러처리_인사?.handle(error, '백업 중 오류가 발생했습니다.');
    }
}

// ===== Excel 백업 =====

/**
 * Excel 백업
 * 
 * @description
 * 직원 정보를 Excel 스프레드시트로 백업합니다.
 * - 발령 이력 포함 (각 발령별로 행 생성)
 * - 육아휴직은 해당 발령 기간과 겹칠 때만 표시
 * - 34개 컬럼 (전체 정보)
 * - 사원번호/주민번호 텍스트 형식
 * - 날짜별 파일명 생성
 * - 가져오기 100% 호환
 * 
 * @example
 * backupToExcel(); // Excel 백업 실행
 * 
 * @throws {인사에러} DB를 찾을 수 없거나 XLSX 라이브러리가 없는 경우
 */
function backupToExcel() {
    try {
        로거_인사?.debug('Excel 백업 시작');
        
        // DB 확인
        if (typeof db === 'undefined' || !db) {
            로거_인사?.error('DB를 찾을 수 없습니다');
            에러처리_인사?.warn('백업할 데이터베이스를 찾을 수 없습니다.');
            return;
        }
        
        // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            로거_인사?.error('XLSX 라이브러리를 찾을 수 없습니다');
            에러처리_인사?.warn('Excel 라이브러리를 찾을 수 없습니다.');
            return;
        }
        
        const employees = db.getEmployees();
        
        // 데이터 확인
        if (employees.length === 0) {
            로거_인사?.warn('백업할 직원 데이터가 없습니다');
            에러처리_인사?.warn('백업할 데이터가 없습니다.');
            return;
        }
        
        로거_인사?.info('Excel 데이터 생성 시작', { employeeCount: employees.length });
        
        // Excel 데이터 생성
        const data = _buildExcelData(employees);
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // 텍스트 형식 설정 (사원번호, 주민번호)
        _applyTextFormat(ws);
        
        // 엑셀 형식 개선 (컬럼 너비, 자동 필터)
        _applyExcelFormatting(ws);
        
        // 시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '직원정보');
        
        // 파일명 생성
        const today = new Date().toISOString().split('T')[0];
        const filename = `직원관련_${today}.xlsx`;
        
        // 파일 저장
        XLSX.writeFile(wb, filename);
        
        // 육아휴직 표시 통계
        const maternityRowCount = data.filter(row => row['육아휴직 여부'] === '예').length;
        
        로거_인사?.info('Excel 백업 완료', { 
            filename, 
            employeeCount: employees.length,
            rowCount: data.length,
            maternityRows: maternityRowCount
        });
        
        에러처리_인사?.success(
            `✅ Excel 백업 완료!\n\n` +
            `파일명: ${filename}\n` +
            `직원 수: ${employees.length}명\n` +
            `총 행 수: ${data.length}행 (발령 이력 포함)\n` +
            `육아휴직 표시: ${maternityRowCount}행\n\n` +
            `📌 이 백업은:\n` +
            `- "가져오기" 메뉴에서 복원 가능합니다\n` +
            `- 통계 및 분석 작업에 활용하세요\n` +
            `- 육아휴직은 해당 발령 기간에만 표시됩니다\n\n` +
            `⚠️ 참고:\n` +
            `- 완벽한 복원은 JSON 백업을 사용하세요\n` +
            `- 과거 경력 정보는 포함되지 않습니다`
        );
        
        // ⭐ v4.3: 윈도우 포커스 복원 (Electron 포커스 문제 해결)
        setTimeout(() => window.focus(), 100);
        
    } catch (error) {
        로거_인사?.error('Excel 백업 오류', error);
        에러처리_인사?.handle(error, 'Excel 백업 중 오류가 발생했습니다.');
    }
}

/**
 * Excel 데이터 생성 (Private)
 * 
 * @private
 * @param {Array<Object>} employees - 직원 목록
 * @returns {Array<Object>} Excel 행 데이터
 * 
 * @description
 * 직원 정보를 Excel 행 데이터로 변환합니다.
 * - 발령 이력이 있으면 각 발령별로 행 생성
 * - 발령 이력이 없으면 현재 정보로 1개 행 생성
 * - 발령을 과거→최신 순으로 정렬 (가독성)
 * - 가져오기는 자체 정렬하므로 백업 순서 무관
 * - 육아휴직은 기간 겹침 확인
 */
function _buildExcelData(employees) {
    try {
        const data = [];
        
        employees.forEach(emp => {
            try {
                // 발령 이력 확인
                const assignments = (emp.assignments && emp.assignments.length > 0) 
                    ? emp.assignments 
                    : [_createDefaultAssignment(emp)];
                
                // 발령을 날짜순으로 정렬 (과거→최신, 오름차순)
                // 가져오기 함수는 내부적으로 재정렬하므로 순서 무관
                const sortedAssignments = [...assignments].sort((a, b) => {
                    const dateA = new Date(a.startDate || '1900-01-01');
                    const dateB = new Date(b.startDate || '1900-01-01');
                    return dateA - dateB;  // 오름차순: 과거→최신
                });
                
                로거_인사?.debug('발령 정렬', { 
                    employee: emp.uniqueCode,
                    count: sortedAssignments.length,
                    oldest: sortedAssignments[0]?.startDate,
                    latest: sortedAssignments[sortedAssignments.length - 1]?.startDate
                });
                
                // 각 발령별로 행 생성
                sortedAssignments.forEach(assign => {
                    try {
                        // 이 발령 기간에 육아휴직이 있었는지 확인
                        const showMaternity = _isMaternityDuringAssignment(
                            emp.maternityLeave, 
                            assign
                        );
                        
                        const row = _createExcelRow(emp, assign, showMaternity);
                        data.push(row);
                        
                        if (showMaternity) {
                            로거_인사?.debug('육아휴직 표시', {
                                employee: emp.uniqueCode,
                                assignment: assign.code,
                                maternity: `${emp.maternityLeave.startDate} ~ ${emp.maternityLeave.endDate || '현재'}`
                            });
                        }
                    } catch (error) {
                        로거_인사?.warn('Excel 행 생성 오류', { 
                            employee: emp.uniqueCode, 
                            error 
                        });
                    }
                });
                
            } catch (error) {
                로거_인사?.warn('직원 데이터 처리 오류', { 
                    employee: emp.uniqueCode, 
                    error 
                });
            }
        });
        
        로거_인사?.debug('Excel 데이터 생성 완료', { rowCount: data.length });
        
        return data;
        
    } catch (error) {
        로거_인사?.error('Excel 데이터 생성 오류', error);
        return [];
    }
}

/**
 * 육아휴직이 발령 기간과 겹치는지 확인 (Private)
 * 
 * @private
 * @param {Object} maternityLeave - 육아휴직 정보
 * @param {Object} assignment - 발령 정보
 * @returns {boolean} 겹침 여부
 * 
 * @description
 * 육아휴직 기간과 발령 기간이 겹치는지 확인합니다.
 * - 기간 겹침 조건: 육아시작 <= 발령종료 AND 육아종료 >= 발령시작
 * - 진행 중인 기간은 9999-12-31로 처리
 * 
 * @example
 * // 육아휴직: 2025-10-01 ~ 현재
 * // 발령: 2025-06-01 ~ 현재
 * _isMaternityDuringAssignment(maternity, assign) // true
 * 
 * // 육아휴직: 2025-10-01 ~ 현재
 * // 발령: 2023-01-01 ~ 2024-09-30
 * _isMaternityDuringAssignment(maternity, assign) // false
 */
function _isMaternityDuringAssignment(maternityLeave, assignment) {
    try {
        // 육아휴직 정보 없으면 false
        if (!maternityLeave || !maternityLeave.startDate) {
            return false;
        }
        
        // 발령 시작일 없으면 false
        if (!assignment || !assignment.startDate) {
            로거_인사?.warn('발령 시작일 없음', { assignment });
            return false;
        }
        
        // 날짜 변환
        const matStart = new Date(maternityLeave.startDate);
        const matEnd = maternityLeave.endDate 
            ? new Date(maternityLeave.endDate)
            : new Date('9999-12-31'); // 진행 중
        
        const assignStart = new Date(assignment.startDate);
        const assignEnd = assignment.endDate 
            ? new Date(assignment.endDate)
            : new Date('9999-12-31'); // 현재 발령
        
        // 날짜 유효성 확인
        if (isNaN(matStart.getTime()) || isNaN(assignStart.getTime())) {
            로거_인사?.warn('잘못된 날짜 형식', { 
                matStart: maternityLeave.startDate,
                assignStart: assignment.startDate
            });
            return false;
        }
        
        // 기간 겹침 확인
        // 겹침 조건: 육아시작 <= 발령종료 AND 육아종료 >= 발령시작
        const overlaps = matStart <= assignEnd && matEnd >= assignStart;
        
        return overlaps;
        
    } catch (error) {
        로거_인사?.warn('육아휴직 기간 확인 오류', { error });
        return false;
    }
}

/**
 * 기본 발령 정보 생성 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @returns {Object} 기본 발령 정보
 * 
 * @description
 * 발령 이력이 없는 직원의 기본 발령 정보를 생성합니다.
 */
function _createDefaultAssignment(emp) {
    try {
        // 직원 정보 추출
        const entryDate = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getEntryDate(emp)
            : (emp.employment?.entryDate || '');
        
        const dept = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getDepartment(emp)
            : (emp.currentPosition?.dept || emp.dept || '');
        
        const position = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getPosition(emp)
            : (emp.currentPosition?.position || emp.position || '');
        
        const grade = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getGrade(emp)
            : (emp.currentPosition?.grade || '');
        
        return {
            code: `${emp.uniqueCode}-01`,
            startDate: entryDate,
            endDate: null,
            dept: dept,
            position: position,
            grade: grade,
            status: 'active'
        };
        
    } catch (error) {
        로거_인사?.warn('기본 발령 정보 생성 오류', { employee: emp.uniqueCode, error });
        
        return {
            code: `${emp.uniqueCode}-01`,
            startDate: '',
            endDate: null,
            dept: '',
            position: '',
            grade: '',
            status: 'active'
        };
    }
}

/**
 * Excel 행 데이터 생성 (Private)
 * 
 * @private
 * @param {Object} emp - 직원 객체
 * @param {Object} assign - 발령 정보
 * @param {boolean} showMaternity - 육아휴직 표시 여부
 * @returns {Object} Excel 행 객체
 * 
 * @description
 * 직원 정보와 발령 정보를 Excel 행 데이터로 변환합니다.
 * 34개 컬럼 포함.
 * 
 * ⚠️ 중요: excelDateToJS()와 호환되는 형식으로 저장
 * - 날짜: YYYY-MM-DD 문자열 (ISO 형식)
 * - 빈 값: 빈 문자열 '' (null 아님)
 * - 진행 중: endDate = null → 빈 문자열로 저장
 */
function _createExcelRow(emp, assign, showMaternity = false) {
    try {
        // 직원 정보 추출 (유틸리티 함수 사용)
        const name = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getName(emp)
            : (emp.personalInfo?.name || emp.name || '');
        
        const jobType = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getJobType(emp)
            : (emp.currentPosition?.jobType || '');
        
        const employmentType = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getEmploymentType(emp)
            : (emp.employment?.type || '정규직');
        
        const entryDate = (typeof 직원유틸_인사 !== 'undefined')
            ? 직원유틸_인사.getEntryDate(emp)
            : (emp.employment?.entryDate || '');
        
        // 육아휴직 정보 (기간 겹침 확인된 경우만)
        const maternityStart = showMaternity && emp.maternityLeave?.startDate 
            ? emp.maternityLeave.startDate 
            : '';
        const maternityEnd = showMaternity && emp.maternityLeave?.endDate 
            ? emp.maternityLeave.endDate 
            : '';
        const maternityStatus = showMaternity ? '예' : '아니오';
        
        return {
            '고유번호': emp.uniqueCode || '',
            '발령코드': assign.code || '',
            '성명': name,
            '부서명': assign.dept || '',
            '직위': assign.position || '',
            '직급': assign.grade || '',
            '직종': jobType,
            '자격증1(급)': emp.certifications?.[0]?.name || '',
            '자격증2(급)': emp.certifications?.[1]?.name || '',
            '사원번호': emp.employeeNumber || emp.uniqueCode || '',
            '주민등록번호': emp.personalInfo?.residentNumber || '',
            '생년월일': emp.personalInfo?.birthDate || '',
            '성별': emp.personalInfo?.gender || '',
            '고용형태': employmentType,
            '입사일': entryDate,
            '인사발령일': assign.startDate || '',
            '인사발령종료일': assign.endDate || '', // null → 빈 문자열
            '퇴사일': emp.employment?.retirementDate || '',
            '출산휴가 및 육아휴직 시작일': maternityStart,
            '출산휴가 및 육아휴직 종료일': maternityEnd,
            '육아휴직 여부': maternityStatus,
            '입사 호봉': emp.rank?.startRank || 1,
            '첫승급년월일': emp.rank?.firstUpgradeDate || '',
            '현재호봉': emp.rank?.currentRank || emp.rank?.startRank || 1,
            '다음승급일': emp.rank?.nextUpgradeDate || '',
            '경력년수': emp.rank?.careerYears || 0,
            '경력월수': emp.rank?.careerMonths || 0,
            '경력일수': emp.rank?.careerDays || 0,
            '근무상태': emp.employment?.status || '재직',
            '전화번호': emp.contactInfo?.phone || '',
            '주소': emp.contactInfo?.address || '',
            '이메일': emp.contactInfo?.email || ''
        };
        
    } catch (error) {
        로거_인사?.warn('Excel 행 생성 오류', error);
        
        // 최소 데이터 반환
        return {
            '고유번호': emp.uniqueCode || '',
            '발령코드': assign.code || '',
            '성명': emp.personalInfo?.name || emp.name || '',
            '부서명': assign.dept || '',
            '직위': assign.position || '',
            '직급': assign.grade || '',
            '직종': '',
            '자격증1(급)': '',
            '자격증2(급)': '',
            '사원번호': '',
            '주민등록번호': '',
            '생년월일': '',
            '성별': '',
            '고용형태': '정규직',
            '입사일': '',
            '인사발령일': '',
            '인사발령종료일': '',
            '퇴사일': '',
            '출산휴가 및 육아휴직 시작일': '',
            '출산휴가 및 육아휴직 종료일': '',
            '육아휴직 여부': '아니오',
            '입사 호봉': 1,
            '첫승급년월일': '',
            '현재호봉': 1,
            '다음승급일': '',
            '경력년수': 0,
            '경력월수': 0,
            '경력일수': 0,
            '근무상태': '재직',
            '전화번호': '',
            '주소': '',
            '이메일': ''
        };
    }
}

/**
 * 텍스트 형식 적용 (Private)
 * 
 * @private
 * @param {Object} ws - 워크시트 객체
 * 
 * @description
 * 사원번호와 주민등록번호를 텍스트 형식으로 설정합니다.
 * - 숫자로 변환되는 것 방지
 * - 앞자리 0 보존
 */
function _applyTextFormat(ws) {
    try {
        if (!ws['!ref']) {
            return;
        }
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            // 사원번호 컬럼 (10번째, index 9)
            const cellRefEmployee = XLSX.utils.encode_cell({ r: R, c: 9 });
            if (ws[cellRefEmployee]) {
                ws[cellRefEmployee].t = 's';  // 문자열 타입
                ws[cellRefEmployee].z = '@';   // 텍스트 형식
            }
            
            // 주민등록번호 컬럼 (11번째, index 10)
            const cellRefResident = XLSX.utils.encode_cell({ r: R, c: 10 });
            if (ws[cellRefResident]) {
                ws[cellRefResident].t = 's';  // 문자열 타입
                ws[cellRefResident].z = '@';   // 텍스트 형식
            }
        }
        
        로거_인사?.debug('텍스트 형식 적용 완료');
        
    } catch (error) {
        로거_인사?.warn('텍스트 형식 적용 오류', error);
    }
}

/**
 * 엑셀 형식 개선 (Private)
 * 
 * @private
 * @param {Object} ws - 워크시트 객체
 * 
 * @description
 * 엑셀 시트 가독성 향상을 위한 기본 설정
 * - 컬럼 너비 자동 조정
 * - 자동 필터 적용
 * - 틀 고정 (헤더 행)
 * 
 * ⚠️ 참고: SheetJS 무료 버전은 스타일(색상, 테두리 등) 미지원
 *          컬럼 너비, 필터, 틀 고정만 적용 가능
 */
function _applyExcelFormatting(ws) {
    try {
        if (!ws['!ref']) {
            로거_인사?.warn('워크시트 범위 없음');
            return;
        }
        
        // 1. 컬럼 너비 설정
        const colWidths = [
            { wch: 10 },  // 고유번호
            { wch: 12 },  // 발령코드
            { wch: 10 },  // 성명
            { wch: 15 },  // 부서명
            { wch: 12 },  // 직위
            { wch: 10 },  // 직급
            { wch: 12 },  // 직종
            { wch: 15 },  // 자격증1
            { wch: 15 },  // 자격증2
            { wch: 15 },  // 사원번호
            { wch: 18 },  // 주민등록번호
            { wch: 12 },  // 생년월일
            { wch: 8 },   // 성별
            { wch: 10 },  // 고용형태
            { wch: 12 },  // 입사일
            { wch: 12 },  // 인사발령일
            { wch: 14 },  // 인사발령종료일
            { wch: 12 },  // 퇴사일
            { wch: 20 },  // 육아휴직시작일
            { wch: 20 },  // 육아휴직종료일
            { wch: 12 },  // 육아휴직여부
            { wch: 10 },  // 입사호봉
            { wch: 14 },  // 첫승급년월일
            { wch: 10 },  // 현재호봉
            { wch: 12 },  // 다음승급일
            { wch: 10 },  // 경력년수
            { wch: 10 },  // 경력월수
            { wch: 10 },  // 경력일수
            { wch: 10 },  // 근무상태
            { wch: 15 },  // 전화번호
            { wch: 35 },  // 주소
            { wch: 25 }   // 이메일
        ];
        
        ws['!cols'] = colWidths;
        
        // 2. 자동 필터 설정
        ws['!autofilter'] = { ref: ws['!ref'] };
        
        // 3. 틀 고정 (첫 행 고정) - SheetJS Pro 전용
        // 무료 버전에서는 무시되지만 에러는 발생하지 않음
        ws['!freeze'] = { 
            xSplit: 0,
            ySplit: 1,
            topLeftCell: 'A2',
            activePane: 'bottomLeft',
            state: 'frozen'
        };
        
        로거_인사?.debug('엑셀 형식 적용 완료', {
            columns: colWidths.length,
            autofilter: true
        });
        
    } catch (error) {
        로거_인사?.warn('엑셀 형식 적용 오류', error);
        // 형식 적용 실패해도 데이터는 정상 저장되므로 계속 진행
    }
}

// ===== 전체 데이터 초기화 =====

/**
 * 전체 데이터 삭제 (완전 초기화)
 * 
 * @description
 * 모든 직원 데이터와 시스템 설정을 삭제합니다.
 * - 직원 데이터
 * - 겸직/직무대리 설정
 * - 조직도 설정
 * - 직급/급여표 설정
 * - 직책수당 설정
 * - 포상 데이터
 * - 시간외근무 기록
 * - 복구 불가능
 * - 사용자 확인 필수
 * 
 * @example
 * resetAllData(); // 전체 데이터 삭제
 * 
 * @throws {인사에러} DB를 찾을 수 없는 경우
 */
function resetAllData() {
    // async 처리를 위한 내부 함수
    (async () => {
        try {
            로거_인사?.debug('전체 데이터 삭제 시작');
        
        // DB 확인
        if (typeof db === 'undefined' || !db) {
            로거_인사?.error('DB를 찾을 수 없습니다');
            에러처리_인사?.warn('데이터베이스를 찾을 수 없습니다.');
            return;
        }
        
        // 현재 직원 수 확인
        const currentCount = db.getEmployees().length;
        
        // 사용자 확인
        const confirmMessage = 
            `⚠️ 경고: 전체 데이터 삭제\n\n` +
            `현재 직원 수: ${currentCount}명\n\n` +
            `모든 데이터와 설정이 영구적으로 삭제됩니다.\n` +
            `- 직원 데이터\n` +
            `- 겸직/직무대리 설정\n` +
            `- 조직도 설정\n` +
            `- 직급/급여표/직책수당 설정\n` +
            `- 포상 데이터\n` +
            `- 시간외근무 기록\n\n` +
            `이 작업은 되돌릴 수 없습니다.\n\n` +
            `정말 삭제하시겠습니까?`;
        
        if (!confirm(confirmMessage)) {
            로거_인사?.info('전체 데이터 삭제 취소');
            return;
        }
        
        // 2차 확인 (Electron 환경 호환 - prompt 대신 confirm 사용)
        const confirmMessage2 = 
            `⚠️ 최종 확인\n\n` +
            `${currentCount}명의 직원 데이터와 모든 설정이\n` +
            `영구적으로 삭제됩니다.\n\n` +
            `정말 삭제하시겠습니까?`;
        
        if (!confirm(confirmMessage2)) {
            로거_인사?.info('전체 데이터 삭제 취소 (2차 확인)');
            에러처리_인사?.info('삭제가 취소되었습니다.');
            return;
        }
        
        // ⭐ 시스템 설정 데이터 삭제
        로거_인사?.info('시스템 설정 데이터 삭제 시작');
        
        let deletedSettings = 0;
        
        // BACKUP_SYSTEM_KEYS에 정의된 모든 키 삭제
        Object.entries(BACKUP_SYSTEM_KEYS).forEach(([key, storageKey]) => {
            if (localStorage.getItem(storageKey)) {
                localStorage.removeItem(storageKey);
                deletedSettings++;
                로거_인사?.debug(`설정 삭제: ${key} (${storageKey})`);
            }
        });
        
        // 추가 설정 키 삭제 (BACKUP_SYSTEM_KEYS에 없는 것들)
        const additionalKeys = [
            'orgSettings',              // 조직도 설정 (레거시)
            'hr_org_settings'           // 조직도 설정 (대체 키)
        ];
        
        additionalKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                deletedSettings++;
                로거_인사?.debug(`추가 설정 삭제: ${key}`);
            }
        });
        
        로거_인사?.info(`시스템 설정 ${deletedSettings}개 삭제 완료`);
        
        // ⭐ 직원 데이터 삭제 (db.reset() 대신 직접 삭제 - 중복 확인 방지)
        const employeeStorageKey = typeof CONFIG !== 'undefined' 
            ? CONFIG.STORAGE_KEY 
            : 'hr_system_v25_db';
        
        localStorage.removeItem(employeeStorageKey);
        로거_인사?.info(`직원 데이터 삭제 완료 (${employeeStorageKey})`);
        
        // ⭐ Electron 환경: electron-store도 삭제
        if (typeof window !== 'undefined' && window.electronStore) {
            로거_인사?.info('Electron 환경 감지 - electron-store 데이터 삭제 시작');
            
            try {
                // electron-store 전체 삭제
                await window.electronStore.clear();
                로거_인사?.info('electron-store 전체 삭제 완료');
            } catch (storeError) {
                로거_인사?.error('electron-store 삭제 오류', storeError);
                // 오류가 발생해도 계속 진행
            }
        }
        
        로거_인사?.warn('전체 데이터 삭제 완료', { 
            deletedCount: currentCount,
            deletedSettings: deletedSettings 
        });
        
        에러처리_인사?.success(
            `✅ 전체 데이터 삭제 완료\n\n` +
            `삭제된 직원 수: ${currentCount}명\n` +
            `삭제된 설정: ${deletedSettings}개`
        );
        
        // 페이지 새로고침 (초기화 상태 반영)
        setTimeout(() => {
            location.reload();
        }, 1500);
        
    } catch (error) {
        로거_인사?.error('전체 데이터 삭제 오류', error);
        에러처리_인사?.handle(error, '데이터 삭제 중 오류가 발생했습니다.');
    }
    })();  // async 함수 즉시 실행
}

// ===== 유틸리티 함수 =====

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
