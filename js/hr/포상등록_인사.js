/**
 * 포상등록_인사.js - 포상(표창) 등록 관리
 * 
 * 포상 데이터 등록, 수정, 삭제
 * - 엑셀 일괄 업로드 (성명 + 입사일 매칭)
 * - 개별 등록/수정/삭제
 * - AwardsManager 클래스 (데이터 관리)
 * 
 * @version 1.0.0
 * @since 2025-01-15
 * @location js/hr/포상등록_인사.js
 * 
 * [데이터 저장소]
 * - localStorage 키: 'hr_awards_data'
 * - 직원 DB와 별도 관리 (퇴사자 포상도 보존)
 * - employeeId로 현재 직원 연결
 * 
 * [의존성]
 * - 상수_인사.js (CONFIG)
 * - 데이터베이스_인사.js (db)
 * - 로거_인사.js (로거_인사) - 선택
 * - 에러처리_인사.js (에러처리_인사) - 선택
 * - DOM유틸_인사.js (DOM유틸_인사) - 선택
 * - XLSX (SheetJS) - 엑셀 처리
 */

// ===== 상수 정의 =====

/**
 * 포상 데이터 저장소 키
 * @constant {string}
 */
const AWARDS_STORAGE_KEY = 'hr_awards_data';

/**
 * 포상 구분 옵션
 * @constant {Object}
 */
const AWARD_TYPES = Object.freeze({
    INTERNAL: '내부',
    EXTERNAL: '외부'
});

/**
 * 선정 여부 옵션
 * @constant {Object}
 */
const AWARD_STATUS = Object.freeze({
    SELECTED: '선정',
    NOT_SELECTED: '미선정',
    PENDING: '미발표'
});

/**
 * 선정 여부별 색상
 * @constant {Object}
 */
const AWARD_STATUS_COLORS = Object.freeze({
    '선정': { bg: '#E8F5E9', text: '#2E7D32', border: '#4CAF50' },
    '미선정': { bg: '#F5F5F5', text: '#757575', border: '#BDBDBD' },
    '미발표': { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' }
});

/**
 * 엑셀 컬럼 매핑 (포상대장.xlsx 기준)
 * @constant {Object}
 */
const EXCEL_COLUMN_MAP = Object.freeze({
    type: 0,           // A: 포상구분
    name: 1,           // B: 성명
    entryDate: 2,      // C: 입사일
    retireDate: 3,     // D: 퇴사일
    retireStatus: 4,   // E: 퇴사여부
    position: 5,       // F: 직위
    year: 6,           // G: 포상년도
    awardName: 7,      // H: 포상내역
    honor: 8,          // I: 훈격
    organization: 9,   // J: 포상주관처
    content: 10,       // K: 포상내용
    status: 11,        // L: 선정여부
    awardDate: 12,     // M: 수상년월일
    photo: 13          // N: 상장사진
});

// ===== 데이터 관리 클래스 =====

/**
 * 포상 데이터 관리 클래스
 * @class AwardsManager
 */
class AwardsManager {
    constructor() {
        this.data = this._load();
        로거_인사?.info('포상 데이터 관리자 초기화', {
            awardCount: this.data.awards?.length || 0
        });
    }
    
 /**
 * 기본 데이터 구조
 * @private
 */
    _getDefaultData() {
        return {
            awards: [],
            metadata: {
                lastUpdated: null,
                totalCount: 0,
                version: '1.0'
            }
        };
    }
    
 /**
 * localStorage에서 데이터 로드
 * @private
 */
    _load() {
        try {
            const saved = localStorage.getItem(AWARDS_STORAGE_KEY);
            if (!saved) {
                로거_인사?.debug('저장된 포상 데이터 없음');
                return this._getDefaultData();
            }
            
            const data = JSON.parse(saved);
            로거_인사?.debug('포상 데이터 로드 완료', {
                count: data.awards?.length || 0
            });
            
            return data;
        } catch (error) {
            로거_인사?.error('포상 데이터 로드 실패', error);
            return this._getDefaultData();
        }
    }
    
 /**
 * 데이터 저장
 */
    save() {
        try {
            this.data.metadata.lastUpdated = new Date().toISOString();
            this.data.metadata.totalCount = this.data.awards.length;
            
            localStorage.setItem(AWARDS_STORAGE_KEY, JSON.stringify(this.data));
            
            로거_인사?.info('포상 데이터 저장 완료', {
                count: this.data.awards.length
            });
            
            return true;
        } catch (error) {
            로거_인사?.error('포상 데이터 저장 실패', error);
            에러처리_인사?.handle(error, '포상 데이터 저장 중 오류가 발생했습니다.');
            return false;
        }
    }
    
 /**
 * 전체 포상 목록 조회
 */
    getAll() {
        return this.data.awards || [];
    }
    
 /**
 * 포상 추가
 * @param {Object} award - 포상 데이터
 */
    add(award) {
        try {
            if (!award.id) {
                award.id = this._generateId();
            }
            
 // 직원 DB 매칭 시도
            award.employeeId = this._matchEmployee(award.name, award.entryDate);
            
            this.data.awards.push(award);
            this.save();
            
            로거_인사?.info('포상 추가 완료', {
                id: award.id,
                name: award.name,
                matched: !!award.employeeId
            });
            
            return award;
        } catch (error) {
            로거_인사?.error('포상 추가 실패', error);
            throw error;
        }
    }
    
 /**
 * 포상 수정
 * @param {string} id - 포상 ID
 * @param {Object} updates - 수정할 데이터
 */
    update(id, updates) {
        try {
            const index = this.data.awards.findIndex(a => a.id === id);
            if (index < 0) {
                throw new Error('포상 데이터를 찾을 수 없습니다.');
            }
            
            this.data.awards[index] = { ...this.data.awards[index], ...updates };
            this.save();
            
            로거_인사?.info('포상 수정 완료', { id });
            
            return this.data.awards[index];
        } catch (error) {
            로거_인사?.error('포상 수정 실패', error);
            throw error;
        }
    }
    
 /**
 * 포상 삭제
 * @param {string} id - 포상 ID
 */
    delete(id) {
        try {
            const index = this.data.awards.findIndex(a => a.id === id);
            if (index < 0) {
                throw new Error('포상 데이터를 찾을 수 없습니다.');
            }
            
            this.data.awards.splice(index, 1);
            this.save();
            
            로거_인사?.info('포상 삭제 완료', { id });
            
            return true;
        } catch (error) {
            로거_인사?.error('포상 삭제 실패', error);
            throw error;
        }
    }
    
 /**
 * 직원별 포상 조회
 * @param {string} employeeId - 직원 ID
 */
    getByEmployee(employeeId) {
        return this.data.awards.filter(a => a.employeeId === employeeId);
    }
    
 /**
 * 성명으로 포상 조회 (퇴사자 포함)
 * @param {string} name - 성명
 */
    getByName(name) {
        return this.data.awards.filter(a => a.name === name);
    }
    
 /**
 * 필터링 조회
 * @param {Object} filters - 필터 조건
 */
    getFiltered(filters = {}) {
        let results = [...this.data.awards];
        
 // 포상구분 필터
        if (filters.type && filters.type !== '전체') {
            results = results.filter(a => a.type === filters.type);
        }
        
 // 선정여부 필터
        if (filters.status && filters.status !== '전체') {
            results = results.filter(a => a.status === filters.status);
        }
        
 // 연도 필터
        if (filters.year) {
            results = results.filter(a => a.year == filters.year);
        }
        
 // 기간 필터
        if (filters.startDate) {
            results = results.filter(a => {
                const awardDate = this._parseDate(a.awardDate);
                const startDate = this._parseDate(filters.startDate);
                return awardDate && startDate && awardDate >= startDate;
            });
        }
        
        if (filters.endDate) {
            results = results.filter(a => {
                const awardDate = this._parseDate(a.awardDate);
                const endDate = this._parseDate(filters.endDate);
                return awardDate && endDate && awardDate <= endDate;
            });
        }
        
 // 재직/퇴사 필터
        if (filters.employmentStatus === '재직') {
            results = results.filter(a => !a.isRetired);
        } else if (filters.employmentStatus === '퇴사') {
            results = results.filter(a => a.isRetired);
        }
        
        return results;
    }
    
 /**
 * 연도 목록 조회
 */
    getYears() {
        const years = [...new Set(this.data.awards.map(a => a.year))];
        return years.sort((a, b) => b - a); // 내림차순
    }
    
 /**
 * ID 생성
 * @private
 */
    _generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 5);
        return `award_${timestamp}_${random}`;
    }
    
 /**
 * 직원 DB 매칭
 * @private
 */
    _matchEmployee(name, entryDate) {
        try {
            if (!db || !db.getEmployees) return null;
            
            const employees = db.getEmployees();
            const normalizedEntryDate = this._normalizeDate(entryDate);
            
            const matched = employees.find(emp => {
                const empName = emp.personalInfo?.name || emp.name || '';
                const empEntryDate = this._normalizeDate(
                    emp.employment?.entryDate || emp.entryDate || ''
                );
                
                return empName === name && empEntryDate === normalizedEntryDate;
            });
            
            return matched?.id || null;
        } catch (error) {
            로거_인사?.warn('직원 매칭 실패', { name, entryDate, error });
            return null;
        }
    }
    
 /**
 * 날짜 정규화 (YYYY-MM-DD)
 * @private
 */
    _normalizeDate(dateStr) {
        if (!dateStr) return '';
        
 // 이미 YYYY-MM-DD 형식
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        
 // YYYY.M.D 형식 → YYYY-MM-DD
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
            const parts = dateStr.split('.');
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return dateStr;
    }
    
 /**
 * 날짜 파싱
 * @private
 */
    _parseDate(dateStr) {
        if (!dateStr) return null;
        
        const normalized = this._normalizeDate(dateStr);
        const date = new Date(normalized);
        
        return isNaN(date.getTime()) ? null : date;
    }
    
 /**
 * 일괄 등록 (엑셀 업로드용)
 * @param {Array} awards - 포상 배열
 * @param {boolean} clearExisting - 기존 데이터 삭제 여부
 */
    bulkAdd(awards, clearExisting = false) {
        try {
            if (clearExisting) {
                this.data.awards = [];
            }
            
            let matched = 0;
            let unmatched = 0;
            
            awards.forEach(award => {
                if (!award.id) {
                    award.id = this._generateId();
                }
                
                award.employeeId = this._matchEmployee(award.name, award.entryDate);
                
                if (award.employeeId) {
                    matched++;
                } else {
                    unmatched++;
                }
                
                this.data.awards.push(award);
            });
            
            this.save();
            
            로거_인사?.info('포상 일괄 등록 완료', {
                total: awards.length,
                matched,
                unmatched
            });
            
            return { total: awards.length, matched, unmatched };
        } catch (error) {
            로거_인사?.error('포상 일괄 등록 실패', error);
            throw error;
        }
    }
    
 /**
 * 중복 체크
 * @param {Object} award - 포상 데이터
 */
    isDuplicate(award) {
        return this.data.awards.some(a => 
            a.name === award.name &&
            a.awardDate === award.awardDate &&
            a.awardName === award.awardName &&
            a.organization === award.organization
        );
    }
}

// ===== 전역 인스턴스 =====

/**
 * 포상 데이터 관리자 전역 인스턴스
 * @const {AwardsManager}
 */
const awardsManager = new AwardsManager();

// ===== 엑셀 업로드 =====

/**
 * 포상 엑셀 파일 업로드
 * @param {File} file - 엑셀 파일
 */
function uploadAwardsExcel(file) {
    try {
        로거_인사?.debug('포상 엑셀 업로드 시작', { filename: file?.name });
        
        if (!file) {
            에러처리_인사?.warn('파일을 선택해주세요.');
            return;
        }
        
        if (typeof XLSX === 'undefined') {
            에러처리_인사?.warn('Excel 라이브러리를 찾을 수 없습니다.');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
 // 첫 번째 시트 사용
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
 // JSON으로 변환
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    에러처리_인사?.warn('데이터가 없습니다. (헤더만 있거나 비어있습니다.)');
                    return;
                }
                
 // 헤더 제외한 데이터
                const rows = jsonData.slice(1);
                
 // 포상 데이터 변환
                const awards = _convertExcelToAwards(rows);
                
 // 업로드 확인 모달 표시
                _showUploadConfirmModal(awards, file.name);
                
            } catch (error) {
                로거_인사?.error('엑셀 파싱 오류', error);
                에러처리_인사?.handle(error, '엑셀 파일 처리 중 오류가 발생했습니다.');
            }
        };
        
        reader.onerror = function(error) {
            로거_인사?.error('파일 읽기 오류', error);
            에러처리_인사?.handle(error, '파일을 읽을 수 없습니다.');
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        로거_인사?.error('포상 엑셀 업로드 오류', error);
        에러처리_인사?.handle(error, '엑셀 업로드를 시작할 수 없습니다.');
    }
}

/**
 * 엑셀 데이터를 포상 객체로 변환
 * @private
 */
function _convertExcelToAwards(rows) {
    const awards = [];
    
    rows.forEach((row, index) => {
        try {
 // 빈 행 스킵
            if (!row || !row[EXCEL_COLUMN_MAP.name]) {
                return;
            }
            
            const award = {
 // 원본 정보
                name: String(row[EXCEL_COLUMN_MAP.name] || '').trim(),
                entryDate: _convertExcelDate(row[EXCEL_COLUMN_MAP.entryDate]),
                retireDate: _convertExcelDate(row[EXCEL_COLUMN_MAP.retireDate]),
                isRetired: row[EXCEL_COLUMN_MAP.retireStatus] === '퇴사',
                position: String(row[EXCEL_COLUMN_MAP.position] || '').trim(),
                
 // 포상 정보
                type: String(row[EXCEL_COLUMN_MAP.type] || '').trim(),
                year: parseInt(row[EXCEL_COLUMN_MAP.year]) || new Date().getFullYear(),
                awardDate: _convertExcelDate(row[EXCEL_COLUMN_MAP.awardDate]),
                awardName: String(row[EXCEL_COLUMN_MAP.awardName] || '').trim(),
                honor: String(row[EXCEL_COLUMN_MAP.honor] || '').trim(),
                organization: String(row[EXCEL_COLUMN_MAP.organization] || '').trim(),
                content: String(row[EXCEL_COLUMN_MAP.content] || '').trim(),
                status: String(row[EXCEL_COLUMN_MAP.status] || '선정').trim(),
                photoUrl: String(row[EXCEL_COLUMN_MAP.photo] || '').trim()
            };
            
 // 유효한 데이터만 추가
            if (award.name && award.awardName) {
                awards.push(award);
            }
            
        } catch (error) {
            로거_인사?.warn('행 변환 오류', { index, error });
        }
    });
    
    로거_인사?.info('엑셀 데이터 변환 완료', { count: awards.length });
    
    return awards;
}

/**
 * 엑셀 날짜 변환
 * @private
 */
function _convertExcelDate(value) {
    if (!value) return '';
    
 // 이미 문자열인 경우 정규화
    if (typeof value === 'string') {
        return awardsManager._normalizeDate(value);
    }
    
 // 엑셀 시리얼 번호인 경우
    if (typeof value === 'number') {
        try {
            const date = new Date((value - 25569) * 86400 * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            return '';
        }
    }
    
    return '';
}

/**
 * 업로드 확인 모달 표시
 * @private
 */
function _showUploadConfirmModal(awards, filename) {
 // 기존 데이터 확인
    const existingAwards = awardsManager.getAll();
    const existingCount = existingAwards.length;
    
 // 통계 계산
    const stats = {
        total: awards.length,
        internal: awards.filter(a => a.type === '내부').length,
        external: awards.filter(a => a.type === '외부').length,
        selected: awards.filter(a => a.status === '선정').length,
        notSelected: awards.filter(a => a.status === '미선정').length,
        pending: awards.filter(a => a.status === '미발표').length,
        active: awards.filter(a => !a.isRetired).length,
        retired: awards.filter(a => a.isRetired).length
    };
    
 // 매칭 미리보기
    let matchedCount = 0;
    let unmatchedNames = [];
    
    awards.forEach(award => {
        const matched = awardsManager._matchEmployee(award.name, award.entryDate);
        if (matched) {
            matchedCount++;
        } else {
            if (!unmatchedNames.includes(award.name)) {
                unmatchedNames.push(award.name);
            }
        }
    });
    
 // 중복 체크
    let duplicateCount = 0;
    awards.forEach(award => {
        if (awardsManager.isDuplicate(award)) {
            duplicateCount++;
        }
    });
    
    const modalHtml = `
        <div class="modal-overlay active" id="awards-upload-modal">
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> 포상 데이터 업로드 확인</h3>
                    <button class="modal-close" onclick="closeAwardsUploadModal()">×</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="upload-summary">
                        <p><strong><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> 파일:</strong> ${filename}</p>
                        
                        <!-- 기존 데이터 경고 -->
                        ${existingCount > 0 ? `
                        <div style="margin: 15px 0; padding: 12px; background: #FFF8E1; border-radius: 8px; border-left: 4px solid #FFC107;">
                            <strong style="color: #F57C00;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 기존 데이터 존재</strong>
                            <p style="font-size: 13px; color: #666; margin: 5px 0 0;">
                                현재 <strong>${existingCount}건</strong>의 포상 데이터가 등록되어 있습니다.
                            </p>
                        </div>
                        ` : `
                        <div style="margin: 15px 0; padding: 12px; background: #E8F5E9; border-radius: 8px; border-left: 4px solid #4CAF50;">
                            <strong style="color: #2E7D32;">초기 등록</strong>
                            <p style="font-size: 13px; color: #666; margin: 5px 0 0;">
                                기존 포상 데이터가 없습니다. 새로 등록됩니다.
                            </p>
                        </div>
                        `}
                        
                        <!-- 중복 경고 -->
                        ${duplicateCount > 0 ? `
                        <div style="margin: 15px 0; padding: 12px; background: #FFEBEE; border-radius: 8px; border-left: 4px solid #F44336;">
                            <strong style="color: #C62828;">[주의] 중복 데이터 감지</strong>
                            <p style="font-size: 13px; color: #666; margin: 5px 0 0;">
                                업로드 파일에 기존 데이터와 동일한 포상이 <strong>${duplicateCount}건</strong> 있습니다.<br>
                                (동일 기준: 성명 + 수상일 + 포상내역 + 주관처)
                            </p>
                        </div>
                        ` : ''}
                        
                        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 15px 0;">
                            <div class="stat-item" style="padding: 12px; background: #E3F2FD; border-radius: 8px; text-align: center;">
                                <div class="stat-value" style="font-size: 24px; font-weight: bold; color: #1976D2;">${stats.total}</div>
                                <div class="stat-label" style="font-size: 12px; color: #666;">업로드 건수</div>
                            </div>
                            <div class="stat-item" style="padding: 12px; background: #E8F5E9; border-radius: 8px; text-align: center;">
                                <div class="stat-value" style="font-size: 24px; font-weight: bold; color: #2E7D32;">${matchedCount}</div>
                                <div class="stat-label" style="font-size: 12px; color: #666;">DB 매칭</div>
                            </div>
                            <div class="stat-item" style="padding: 12px; background: #F3E5F5; border-radius: 8px; text-align: center;">
                                <div class="stat-value" style="font-size: 24px; font-weight: bold; color: #7B1FA2;">${existingCount}</div>
                                <div class="stat-label" style="font-size: 12px; color: #666;">기존 데이터</div>
                            </div>
                        </div>
                        
                        <p style="font-size: 13px; color: #666;">
                            내부: ${stats.internal}건 / 외부: ${stats.external}건 | 
                            재직: ${stats.active}명 / 퇴사: ${stats.retired}건
                        </p>
                        
                        ${unmatchedNames.length > 0 ? `
                        <div class="unmatched-info" style="margin-top: 15px; padding: 12px; background: #FFF3E0; border-radius: 8px; border-left: 4px solid #FF9800;">
                            <strong style="color: #E65100;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> DB 미매칭 직원 (${unmatchedNames.length}명)</strong>
                            <p style="font-size: 12px; color: #666; margin: 5px 0 0;">
                                ${unmatchedNames.slice(0, 10).join(', ')}${unmatchedNames.length > 10 ? ` 외 ${unmatchedNames.length - 10}명` : ''}
                            </p>
                            <p style="font-size: 11px; color: #888; margin-top: 5px;">
 * 미매칭 직원의 포상도 원본 정보로 저장됩니다.
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- 업로드 옵션 -->
                        <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                            <strong style="display: block; margin-bottom: 10px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 업로드 방식 선택</strong>
                            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 10px;">
                                <input type="radio" name="awards-upload-mode" value="replace" ${existingCount > 0 ? '' : 'checked'} />
                                <div>
                                    <span style="font-weight: 500;">기존 데이터 삭제 후 등록</span>
                                    <p style="font-size: 12px; color: #666; margin: 2px 0 0;">기존 ${existingCount}건을 모두 삭제하고 새로 ${stats.total}건 등록</p>
                                </div>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; margin-bottom: 10px;">
                                <input type="radio" name="awards-upload-mode" value="add" ${existingCount > 0 ? 'checked' : ''} />
                                <div>
                                    <span style="font-weight: 500;">기존 데이터에 추가</span>
                                    <p style="font-size: 12px; color: #666; margin: 2px 0 0;">기존 ${existingCount}건 + 새로운 ${stats.total}건 = 총 ${existingCount + stats.total}건</p>
                                </div>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                                <input type="radio" name="awards-upload-mode" value="skip-duplicate" />
                                <div>
                                    <span style="font-weight: 500;">중복 제외하고 추가</span>
                                    <p style="font-size: 12px; color: #666; margin: 2px 0 0;">중복 ${duplicateCount}건 제외, 신규 ${stats.total - duplicateCount}건만 추가</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn btn-secondary" onclick="closeAwardsUploadModal()">취소</button>
                    <button class="btn btn-primary" onclick="confirmAwardsUpload()">등록 확인</button>
                </div>
            </div>
        </div>
    `;
    
 // 모달 삽입
    const existingModal = document.getElementById('awards-upload-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
 // 데이터 임시 저장
    window._pendingAwards = awards;
}

/**
 * 업로드 모달 닫기
 */
function closeAwardsUploadModal() {
    const modal = document.getElementById('awards-upload-modal');
    if (modal) {
        modal.remove();
    }
    window._pendingAwards = null;
    
 // 파일 입력 초기화
    const fileInput = document.getElementById('awardsImportFile');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * 업로드 확인 (실제 등록)
 */
function confirmAwardsUpload() {
    try {
        const awards = window._pendingAwards;
        if (!awards || awards.length === 0) {
            에러처리_인사?.warn('등록할 데이터가 없습니다.');
            return;
        }
        
 // 업로드 모드 확인
        const uploadMode = document.querySelector('input[name="awards-upload-mode"]:checked')?.value || 'add';
        
        let result;
        let message = '';
        
        switch (uploadMode) {
            case 'replace':
 // 기존 데이터 삭제 후 등록
                result = awardsManager.bulkAdd(awards, true);
                message = `기존 데이터를 삭제하고 ${result.total}건을 새로 등록했습니다.`;
                break;
                
            case 'add':
 // 기존 데이터에 추가 (중복 포함)
                result = awardsManager.bulkAdd(awards, false);
                message = `기존 데이터에 ${result.total}건을 추가했습니다.`;
                break;
                
            case 'skip-duplicate':
 // 중복 제외하고 추가
                const nonDuplicates = awards.filter(a => !awardsManager.isDuplicate(a));
                if (nonDuplicates.length === 0) {
                    alert('[주의] 모든 데이터가 이미 등록되어 있어 추가할 항목이 없습니다.');
                    return;
                }
                result = awardsManager.bulkAdd(nonDuplicates, false);
                const skippedCount = awards.length - nonDuplicates.length;
                message = `중복 ${skippedCount}건 제외, ${result.total}건을 추가했습니다.`;
                break;
                
            default:
                result = awardsManager.bulkAdd(awards, false);
                message = `${result.total}건을 등록했습니다.`;
        }
        
 // 모달 닫기
        closeAwardsUploadModal();
        
 // 파일 입력 초기화 (가져오기 모듈의 input)
        const fileInput = document.getElementById('awardsImportFile');
        if (fileInput) {
            fileInput.value = '';
        }
        
 // 가져오기 화면 상태 갱신
        refreshAwardsImportStatus();
        
 // 성공 메시지
        alert(
            `포상 데이터 등록 완료!\n\n` +
            `${message}\n` +
            `• DB 매칭: ${result.matched}건\n` +
            `• 미매칭: ${result.unmatched}건 (퇴사자 등)\n\n` +
            `포상 등록 메뉴로 이동합니다.`
        );
        
 // 포상 등록 메뉴로 이동
        if (typeof navigateToModule === 'function') {
            navigateToModule('awards-manage');
        }
        
    } catch (error) {
        로거_인사?.error('포상 등록 확인 오류', error);
        에러처리_인사?.handle(error, '포상 데이터 등록 중 오류가 발생했습니다.');
    }
}

// ===== 포상 등록 모듈 UI =====

/**
 * 포상 등록 모듈 로드 (인력관리)
 */
function loadAwardsManageModule() {
    로거_인사?.debug('포상 등록 모듈 로드');
    
    const container = document.getElementById('awards-manage-module');
    if (!container) {
        로거_인사?.warn('포상 등록 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    container.innerHTML = _renderAwardsManageUI();
    
 // 초기 데이터 로드
    _loadAwardsManageList();
}

/**
 * 포상 등록 UI 렌더링 (인력관리)
 * @private
 */
function _renderAwardsManageUI() {
    const totalCount = awardsManager.getAll().length;
    
    return `
        <div class="awards-manage-container">
            <style>
 /* 포상 등록 전용 스타일 */
                .awards-manage-container {
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .awards-manage-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #4F81BD 0%, #3d6da3 100%);
                    border-radius: 10px;
                    color: white;
                }
                .awards-manage-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .awards-manage-header .count-badge {
                    background: rgba(255,255,255,0.2);
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: normal;
                }
                .awards-filter-bar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                .awards-filter-bar .filter-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .awards-filter-bar .filter-item label {
                    font-size: 13px;
                    color: #666;
                    white-space: nowrap;
                }
                .awards-filter-bar input[type="text"] {
                    padding: 7px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                    width: 180px;
                }
                .awards-filter-bar select {
                    padding: 7px 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 13px;
                    background: white;
                }
                .awards-filter-bar .filter-divider {
                    width: 1px;
                    height: 24px;
                    background: #ddd;
                    margin: 0 4px;
                }
 /* 테이블 컨테이너 - 스크롤 및 헤더 고정 */
                .awards-table-wrap {
                    max-height: 65vh;
                    overflow: scroll !important;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    position: relative;
                    background: white;
                }
 /* 테이블 스타일 */
                .awards-manage-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 13px;
                    overflow: visible !important;
                }
                .awards-manage-table thead th {
                    position: -webkit-sticky;
                    position: sticky;
                    top: 0;
                    background: #4F81BD;
                    color: white;
                    padding: 12px 10px;
                    text-align: center;
                    font-weight: 500;
                    white-space: nowrap;
                    z-index: 10;
                    border-bottom: 2px solid #3d6da3;
                }
                .awards-manage-table tbody td {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    text-align: center;
                    background: white;
                }
                .awards-manage-table tbody tr:hover td {
                    background: #f5f8ff;
                }
                .awards-manage-table tbody tr:nth-child(even) td {
                    background: #fafafa;
                }
                .awards-manage-table tbody tr:nth-child(even):hover td {
                    background: #f5f8ff;
                }
                .awards-manage-table td.text-left {
                    text-align: left;
                }
                .awards-manage-table .btn-group {
                    display: flex;
                    gap: 4px;
                    justify-content: center;
                }
                .awards-manage-table .btn-sm {
                    padding: 4px 8px;
                    font-size: 11px;
                    border-radius: 4px;
                    cursor: pointer;
                    border: none;
                }
                .awards-manage-table .btn-edit {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                .awards-manage-table .btn-edit:hover {
                    background: #bbdefb;
                }
                .awards-manage-table .btn-delete {
                    background: #ffebee;
                    color: #c62828;
                }
                .awards-manage-table .btn-delete:hover {
                    background: #ffcdd2;
                }
            </style>
            
            <!-- 헤더 -->
            <div class="awards-manage-header">
                <h2>
                    <span class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></span> 포상 등록
                    <span class="count-badge">${totalCount}건</span>
                </h2>
                <button class="btn btn-primary" onclick="showAwardRegisterModal()" style="background: white; color: #4F81BD; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 새 포상 등록
                </button>
            </div>
            
            ${totalCount === 0 ? `
            <!-- 데이터 없을 때 안내 -->
            <div class="alert alert-info" style="margin-bottom: 16px;">
                <span class="alert-svg-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span>
                <span>포상 데이터가 없습니다. 기존 포상대장 엑셀을 업로드하려면 <strong>시스템 → 가져오기</strong> 메뉴를 이용하세요.</span>
            </div>
            ` : ''}
            
            <!-- 필터 바 -->
            <div class="awards-filter-bar">
                <div class="filter-item">
                    <label><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></label>
                    <input type="text" id="awards-manage-search" placeholder="이름, 포상내역 검색..." onkeyup="filterAwardsManageList()" />
                </div>
                <div class="filter-divider"></div>
                <div class="filter-item">
                    <label>구분</label>
                    <select id="awards-manage-type" onchange="filterAwardsManageList()">
                        <option value="전체">전체</option>
                        <option value="내부">내부</option>
                        <option value="외부">외부</option>
                    </select>
                </div>
                <div class="filter-item">
                    <label>재직</label>
                    <select id="awards-manage-employment" onchange="filterAwardsManageList()">
                        <option value="전체">전체</option>
                        <option value="재직">재직자</option>
                        <option value="퇴사">퇴사자</option>
                    </select>
                </div>
            </div>
            
            <!-- 테이블 -->
            <div class="awards-table-wrap" id="awards-manage-table">
                <!-- 동적 생성 -->
            </div>
        </div>
    `;
}

/**
 * 포상 등록 목록 로드 (인력관리용)
 * @private
 */
function _loadAwardsManageList() {
    const searchText = document.getElementById('awards-manage-search')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('awards-manage-type')?.value || '전체';
    const employmentFilter = document.getElementById('awards-manage-employment')?.value || '전체';
    
    let awards = awardsManager.getAll();
    
 // 필터 적용
    if (searchText) {
        awards = awards.filter(a => 
            a.name?.toLowerCase().includes(searchText) ||
            a.awardName?.toLowerCase().includes(searchText) ||
            a.organization?.toLowerCase().includes(searchText)
        );
    }
    
    if (typeFilter !== '전체') {
        awards = awards.filter(a => a.type === typeFilter);
    }
    
    if (employmentFilter === '재직') {
        awards = awards.filter(a => !a.isRetired);
    } else if (employmentFilter === '퇴사') {
        awards = awards.filter(a => a.isRetired);
    }
    
 // 정렬: 1) 미발표 우선, 2) 최신순
    awards.sort((a, b) => {
 // 미발표 우선
        const aIsPending = a.status === '미발표';
        const bIsPending = b.status === '미발표';
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;
        
 // 날짜 정규화 후 비교 (최신순)
        const dateA = _normalizeDate(a.awardDate) || '';
        const dateB = _normalizeDate(b.awardDate) || '';
        return dateB.localeCompare(dateA);
    });
    
    const container = document.getElementById('awards-manage-table');
    if (!container) return;
    
    if (awards.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                ${searchText || typeFilter !== '전체' || employmentFilter !== '전체' 
                    ? '검색 결과가 없습니다.' 
                    : '등록된 포상이 없습니다.'}
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <table class="awards-manage-table">
            <thead>
                <tr>
                    <th style="width: 50px;">No</th>
                    <th style="width: 70px;">구분</th>
                    <th style="width: 80px;">성명</th>
                    <th style="width: 70px;">직위</th>
                    <th style="width: 100px;">수상일</th>
                    <th>포상내역</th>
                    <th style="width: 100px;">훈격</th>
                    <th style="width: 70px;">선정</th>
                    <th style="width: 100px;">관리</th>
                </tr>
            </thead>
            <tbody>
                ${awards.map((award, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${award.type === '내부' ? '#e3f2fd' : '#fff3e0'}; color: ${award.type === '내부' ? '#1565c0' : '#e65100'};">${award.type || ''}</span></td>
                        <td style="font-weight: 500;">${award.name || ''}</td>
                        <td>${award.position || ''}</td>
                        <td>${_normalizeDate(award.awardDate) || ''}</td>
                        <td class="text-left" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${award.awardName || ''}">${award.awardName || ''}</td>
                        <td style="font-size: 12px;">${award.honor || ''}</td>
                        <td>
                            <span class="status-badge ${award.status === '선정' ? 'selected' : award.status === '미선정' ? 'not-selected' : 'pending'}">
                                ${award.status || ''}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button class="btn-sm btn-edit" onclick="editAward('${award.id}')">수정</button>
                                <button class="btn-sm btn-delete" onclick="deleteAward('${award.id}')">삭제</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * 날짜 형식 정규화 (2025.01.01 → 2025-01-01)
 * @private
 */
function _normalizeDate(dateStr) {
    if (!dateStr) return '';
    
 // 이미 YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
 // 2025.01.01 → 2025-01-01
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
        return dateStr.replace(/\./g, '-');
    }
    
 // 2025/01/01 → 2025-01-01
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
        return dateStr.replace(/\//g, '-');
    }
    
 // 그 외 형식은 그대로 반환
    return dateStr;
}

/**
 * 포상 등록 목록 필터링
 */
function filterAwardsManageList() {
    _loadAwardsManageList();
}

// ===== 개별 등록/수정/삭제 =====

/**
 * 포상 등록 모달 표시
 */
function showAwardRegisterModal(awardId = null) {
    const isEdit = !!awardId;
    let award = null;
    
    if (isEdit) {
        award = awardsManager.getAll().find(a => a.id === awardId);
        if (!award) {
            에러처리_인사?.warn('포상 데이터를 찾을 수 없습니다.');
            return;
        }
    }
    
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2000; y--) {
        years.push(y);
    }
    
    const modalHtml = `
        <div class="modal-overlay active" id="award-register-modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>${isEdit ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 포상 수정' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 포상 등록'}</h3>
                    <button class="modal-close" onclick="closeAwardRegisterModal()">×</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <input type="hidden" id="award-id" value="${award?.id || ''}" />
                    
                    <!-- 실제 저장될 값 (숨김) -->
                    <input type="hidden" id="award-name" value="${award?.name || ''}" />
                    <input type="hidden" id="award-entry-date" value="${award?.entryDate || ''}" />
                    <input type="hidden" id="award-position" value="${award?.position || ''}" />
                    <input type="hidden" id="award-is-retired" value="${award?.isRetired ? 'true' : 'false'}" />
                    <input type="hidden" id="award-employee-id" value="${award?.employeeId || ''}" />
                    
                    <!-- 직원 정보 -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <h4 style="margin: 0 0 15px; font-size: 14px; color: #333;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 직원 정보</h4>
                        
                        <!-- 직원 검색 -->
                        <div style="position: relative; margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">직원 검색 *</label>
                            <input type="text" id="award-employee-search" class="form-control" 
                                   placeholder="이름, 부서, 직위로 검색..." 
                                   autocomplete="off"
                                   oninput="searchEmployeeForAward(this.value)"
                                   onfocus="searchEmployeeForAward(this.value)"
                                   style="width: 100%;" />
                            <!-- 검색 결과 드롭다운 -->
                            <div id="award-employee-dropdown" style="
                                display: none;
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                max-height: 250px;
                                overflow-y: auto;
                                background: white;
                                border: 1px solid #ddd;
                                border-radius: 6px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                z-index: 1000;
                            "></div>
                            <small style="color: #666; font-size: 11px;">퇴사자는 아래 "직접 입력" 버튼을 클릭하세요.</small>
                        </div>
                        
                        <!-- 선택된 직원 표시 -->
                        <div id="award-selected-employee" style="display: ${award?.name ? 'block' : 'none'}; margin-bottom: 15px; padding: 12px; background: #E8F5E9; border-radius: 6px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 24px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                                    <div>
                                        <div id="award-selected-name" style="font-weight: 600; font-size: 15px;">${award?.name || ''}</div>
                                        <div id="award-selected-info" style="font-size: 12px; color: #666;">${award?.position || ''}</div>
                                    </div>
                                </div>
                                <button type="button" onclick="clearSelectedEmployee()" style="
                                    background: none; border: none; cursor: pointer; 
                                    font-size: 18px; color: #999; padding: 4px 8px;
                                " title="선택 해제">✕</button>
                            </div>
                        </div>
                        
                        <!-- 직접 입력 버튼 -->
                        <div id="award-manual-toggle" style="display: ${award?.name ? 'none' : 'block'};">
                            <button type="button" onclick="toggleManualInput()" class="btn btn-secondary btn-small" style="font-size: 12px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 퇴사자/외부인 직접 입력
                            </button>
                        </div>
                        
                        <!-- 직접 입력 영역 -->
                        <div id="award-manual-input" style="display: none; margin-top: 15px; padding: 12px; background: #fff; border: 1px dashed #ccc; border-radius: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="font-size: 12px; color: #E65100; font-weight: 500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 퇴사자/외부인 직접 입력</span>
                                <button type="button" onclick="toggleManualInput()" style="background: none; border: none; cursor: pointer; color: #999;">✕</button>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-size: 13px;">성명 *</label>
                                    <input type="text" id="award-manual-name" class="form-control" placeholder="이름 입력" 
                                           oninput="document.getElementById('award-name').value=this.value" />
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-size: 13px;">입사일</label>
                                    <input type="date" id="award-manual-entry-date" class="form-control" 
                                           oninput="document.getElementById('award-entry-date').value=this.value" />
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; font-size: 13px;">직위</label>
                                    <input type="text" id="award-manual-position" class="form-control" placeholder="직위 입력" 
                                           oninput="document.getElementById('award-position').value=this.value" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 포상 정보 -->
                    <div style="padding: 15px; background: #E3F2FD; border-radius: 8px;">
                        <h4 style="margin: 0 0 15px; font-size: 14px; color: #333;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> 포상 정보</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">포상구분 *</label>
                                <select id="award-type" class="form-control">
                                    <option value="내부" ${award?.type === '내부' ? 'selected' : ''}>내부</option>
                                    <option value="외부" ${award?.type === '외부' ? 'selected' : ''}>외부</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">포상년도 *</label>
                                <select id="award-year" class="form-control">
                                    ${years.map(y => `<option value="${y}" ${award?.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">수상년월일 *</label>
                                <input type="date" id="award-date" class="form-control" value="${award?.awardDate || ''}" />
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">포상내역 *</label>
                                <input type="text" id="award-name-detail" class="form-control" value="${award?.awardName || ''}" placeholder="예: 사회복지의 날" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">훈격</label>
                                <input type="text" id="award-honor" class="form-control" value="${award?.honor || ''}" placeholder="예: 의왕시장" />
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">포상주관처</label>
                                <input type="text" id="award-organization" class="form-control" value="${award?.organization || ''}" placeholder="예: 의왕시" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-size: 13px;">포상내용</label>
                                <input type="text" id="award-content" class="form-control" value="${award?.content || ''}" placeholder="예: 표창패" />
                            </div>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">선정여부 *</label>
                            <select id="award-status" class="form-control" style="width: 150px;">
                                <option value="선정" ${award?.status === '선정' ? 'selected' : ''}>선정</option>
                                <option value="미선정" ${award?.status === '미선정' ? 'selected' : ''}>미선정</option>
                                <option value="미발표" ${award?.status === '미발표' ? 'selected' : ''}>미발표</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn btn-secondary" onclick="closeAwardRegisterModal()">취소</button>
                    <button class="btn btn-primary" onclick="saveAward()">
                        ${isEdit ? '수정' : '등록'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('award-register-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 포상 등록 모달 닫기
 */
function closeAwardRegisterModal() {
    const modal = document.getElementById('award-register-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 직원 검색 (자동완성)
 */
function searchEmployeeForAward(query) {
    const dropdown = document.getElementById('award-employee-dropdown');
    if (!dropdown) return;
    
 // 검색어가 없으면 드롭다운 숨김
    if (!query || query.trim().length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    const searchTerm = query.trim().toLowerCase();
    
    try {
        if (!db || !db.getEmployees) return;
        
        const employees = db.getEmployees();
        
 // 재직자만 필터링 + 검색
        const results = employees.filter(emp => {
 // 퇴사자 제외
            const retireDate = emp.employment?.retirementDate;
            const isRetired = retireDate && retireDate !== '' && retireDate !== null && retireDate !== 'null';
            if (isRetired) return false;
            
 // 검색어 매칭
            let name, dept, position;
            if (typeof 직원유틸_인사 !== 'undefined') {
                name = 직원유틸_인사.getName(emp) || '';
                dept = 직원유틸_인사.getDepartment(emp) || '';
                position = 직원유틸_인사.getPosition(emp) || '';
            } else {
                name = emp.personalInfo?.name || emp.name || '';
                dept = emp.currentPosition?.dept || '';
                position = emp.currentPosition?.position || '';
            }
            
            return name.toLowerCase().includes(searchTerm) ||
                   dept.toLowerCase().includes(searchTerm) ||
                   position.toLowerCase().includes(searchTerm);
        });
        
 // 결과 표시 (최대 10개)
        if (results.length === 0) {
            dropdown.innerHTML = `
                <div style="padding: 12px; text-align: center; color: #999; font-size: 13px;">
                    검색 결과가 없습니다
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }
        
        dropdown.innerHTML = results.slice(0, 10).map(emp => {
            let name, dept, position, entryDate;
            if (typeof 직원유틸_인사 !== 'undefined') {
                name = 직원유틸_인사.getName(emp);
                dept = 직원유틸_인사.getDepartment(emp);
                position = 직원유틸_인사.getPosition(emp);
                entryDate = 직원유틸_인사.getEntryDate(emp);
            } else {
                name = emp.personalInfo?.name || emp.name || '';
                dept = emp.currentPosition?.dept || '';
                position = emp.currentPosition?.position || '';
                entryDate = emp.employment?.entryDate || '';
            }
            
            const displayInfo = [dept, position].filter(v => v).join(' ');
            
            return `
                <div onclick="selectEmployeeForAward('${emp.id}')" style="
                    padding: 10px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                    transition: background 0.15s;
                " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                    <div style="font-weight: 500; font-size: 14px;">${name}</div>
                    <div style="font-size: 12px; color: #666;">${displayInfo}</div>
                </div>
            `;
        }).join('');
        
        if (results.length > 10) {
            dropdown.innerHTML += `
                <div style="padding: 8px 12px; text-align: center; color: #999; font-size: 11px; background: #fafafa;">
                    외 ${results.length - 10}명 더 있음
                </div>
            `;
        }
        
        dropdown.style.display = 'block';
        
    } catch (e) {
        console.error('직원 검색 오류:', e);
    }
}

/**
 * 직원 선택 (검색 결과에서)
 */
function selectEmployeeForAward(employeeId) {
    const dropdown = document.getElementById('award-employee-dropdown');
    const searchInput = document.getElementById('award-employee-search');
    const selectedEmployee = document.getElementById('award-selected-employee');
    const manualToggle = document.getElementById('award-manual-toggle');
    const manualInput = document.getElementById('award-manual-input');
    
 // 숨겨진 필드
    const hiddenName = document.getElementById('award-name');
    const hiddenEntryDate = document.getElementById('award-entry-date');
    const hiddenPosition = document.getElementById('award-position');
    const hiddenIsRetired = document.getElementById('award-is-retired');
    const hiddenEmployeeId = document.getElementById('award-employee-id');
    
    try {
        const employees = db.getEmployees();
        const emp = employees.find(e => e.id === employeeId);
        
        if (!emp) return;
        
        let name, dept, position, entryDate;
        if (typeof 직원유틸_인사 !== 'undefined') {
            name = 직원유틸_인사.getName(emp);
            dept = 직원유틸_인사.getDepartment(emp);
            position = 직원유틸_인사.getPosition(emp);
            entryDate = 직원유틸_인사.getEntryDate(emp);
        } else {
            name = emp.personalInfo?.name || emp.name || '';
            dept = emp.currentPosition?.dept || '';
            position = emp.currentPosition?.position || '';
            entryDate = emp.employment?.entryDate || '';
        }
        
 // 드롭다운 숨기기
        if (dropdown) dropdown.style.display = 'none';
        if (searchInput) searchInput.value = '';
        
 // 선택된 직원 표시
        if (selectedEmployee) {
            selectedEmployee.style.display = 'block';
            const nameDisplay = document.getElementById('award-selected-name');
            const infoDisplay = document.getElementById('award-selected-info');
            
            if (nameDisplay) nameDisplay.textContent = name;
            if (infoDisplay) {
                const infoParts = [dept, position, entryDate ? `입사: ${entryDate}` : ''].filter(v => v);
                infoDisplay.textContent = infoParts.join(' | ');
            }
        }
        
 // 직접 입력 버튼/영역 숨기기
        if (manualToggle) manualToggle.style.display = 'none';
        if (manualInput) manualInput.style.display = 'none';
        
 // 숨겨진 필드에 값 설정
        if (hiddenName) hiddenName.value = name;
        if (hiddenEntryDate) hiddenEntryDate.value = entryDate;
        if (hiddenPosition) hiddenPosition.value = position;
        if (hiddenIsRetired) hiddenIsRetired.value = 'false';
        if (hiddenEmployeeId) hiddenEmployeeId.value = employeeId;
        
        로거_인사?.debug('직원 선택 완료', { employeeId, name });
        
    } catch (e) {
        console.error('직원 선택 오류:', e);
    }
}

/**
 * 선택된 직원 해제
 */
function clearSelectedEmployee() {
    const selectedEmployee = document.getElementById('award-selected-employee');
    const manualToggle = document.getElementById('award-manual-toggle');
    const searchInput = document.getElementById('award-employee-search');
    
 // 숨겨진 필드
    const hiddenName = document.getElementById('award-name');
    const hiddenEntryDate = document.getElementById('award-entry-date');
    const hiddenPosition = document.getElementById('award-position');
    const hiddenIsRetired = document.getElementById('award-is-retired');
    const hiddenEmployeeId = document.getElementById('award-employee-id');
    
 // UI 초기화
    if (selectedEmployee) selectedEmployee.style.display = 'none';
    if (manualToggle) manualToggle.style.display = 'block';
    if (searchInput) searchInput.value = '';
    
 // 숨겨진 필드 초기화
    if (hiddenName) hiddenName.value = '';
    if (hiddenEntryDate) hiddenEntryDate.value = '';
    if (hiddenPosition) hiddenPosition.value = '';
    if (hiddenIsRetired) hiddenIsRetired.value = 'false';
    if (hiddenEmployeeId) hiddenEmployeeId.value = '';
}

/**
 * 직접 입력 토글
 */
function toggleManualInput() {
    const manualInput = document.getElementById('award-manual-input');
    const manualToggle = document.getElementById('award-manual-toggle');
    const selectedEmployee = document.getElementById('award-selected-employee');
    const hiddenIsRetired = document.getElementById('award-is-retired');
    
    if (!manualInput) return;
    
    const isVisible = manualInput.style.display === 'block';
    
    if (isVisible) {
 // 닫기
        manualInput.style.display = 'none';
        if (manualToggle) manualToggle.style.display = 'block';
    } else {
 // 열기
        manualInput.style.display = 'block';
        if (manualToggle) manualToggle.style.display = 'none';
        if (selectedEmployee) selectedEmployee.style.display = 'none';
        if (hiddenIsRetired) hiddenIsRetired.value = 'true'; // 직접 입력은 퇴사자
        
 // 숨겨진 필드 초기화
        document.getElementById('award-name').value = '';
        document.getElementById('award-entry-date').value = '';
        document.getElementById('award-position').value = '';
        document.getElementById('award-employee-id').value = '';
    }
}

/**
 * 드롭다운 외부 클릭 시 닫기
 */
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('award-employee-dropdown');
    const searchInput = document.getElementById('award-employee-search');
    
    if (dropdown && searchInput) {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});

// 기존 함수 유지 (호환성)
function onAwardEmployeeSelect() {
 // 더 이상 사용하지 않음 - 검색 기반으로 변경됨
}

/**
 * 포상 저장
 */
function saveAward() {
    try {
        const id = document.getElementById('award-id')?.value;
        const employeeId = document.getElementById('award-employee-id')?.value;
        
 // 숨겨진 필드에서 직원 정보 가져오기
        const name = document.getElementById('award-name')?.value?.trim() || '';
        const entryDate = document.getElementById('award-entry-date')?.value || '';
        const position = document.getElementById('award-position')?.value?.trim() || '';
        const isRetired = document.getElementById('award-is-retired')?.value === 'true';
        
 // 날짜 정규화
        const rawAwardDate = document.getElementById('award-date')?.value || '';
        const awardDate = _normalizeDate(rawAwardDate);
        
        const award = {
            name: name,
            entryDate: entryDate,
            position: position,
            type: document.getElementById('award-type')?.value || '내부',
            year: parseInt(document.getElementById('award-year')?.value) || new Date().getFullYear(),
            awardDate: awardDate,
            awardName: document.getElementById('award-name-detail')?.value?.trim() || '',
            honor: document.getElementById('award-honor')?.value?.trim() || '',
            organization: document.getElementById('award-organization')?.value?.trim() || '',
            content: document.getElementById('award-content')?.value?.trim() || '',
            status: document.getElementById('award-status')?.value || '선정',
            isRetired: isRetired
        };
        
 // 디버그 로그
        console.log('저장할 포상 데이터:', award);
        console.log('수정 ID:', id);
        
 // 직원 선택한 경우
        if (employeeId) {
            award.employeeId = employeeId;
        }
        
 // 유효성 검사
        if (!award.name) {
            에러처리_인사?.warn('직원을 선택하거나 성명을 입력해주세요.');
            return;
        }
 // 미발표가 아닌 경우에만 수상일 필수
        if (award.status !== '미발표' && !award.awardDate) {
            에러처리_인사?.warn('수상년월일을 입력해주세요.');
            return;
        }
        if (!award.awardName) {
            에러처리_인사?.warn('포상내역을 입력해주세요.');
            return;
        }
        
        if (id) {
 // 수정
            awardsManager.update(id, award);
            alert('포상 정보가 수정되었습니다.');
        } else {
 // 등록
            awardsManager.add(award);
            alert('포상 정보가 등록되었습니다.');
        }
        
        closeAwardRegisterModal();
        
 // 포상 등록 목록 새로고침
        _loadAwardsManageList();
        
    } catch (error) {
        로거_인사?.error('포상 저장 오류', error);
        에러처리_인사?.handle(error, '포상 저장 중 오류가 발생했습니다.');
    }
}

/**
 * 포상 수정
 */
function editAward(id) {
    showAwardRegisterModal(id);
}

/**
 * 포상 삭제
 */
function deleteAward(id) {
    if (!confirm('정말 삭제하시겠습니까?\n[주의] 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        awardsManager.delete(id);
        alert('삭제되었습니다.');
        
 // 포상 등록 목록 새로고침
        _loadAwardsManageList();
    } catch (error) {
        로거_인사?.error('포상 삭제 오류', error);
        에러처리_인사?.handle(error, '포상 삭제 중 오류가 발생했습니다.');
    }
}

// ===== 인사카드 연동 =====

/**
 * 직원의 포상 이력 조회 (인사카드용)
 * @param {string} employeeId - 직원 ID
 */
function getEmployeeAwards(employeeId) {
    return awardsManager.getByEmployee(employeeId);
}

/**
 * 인사카드용 포상 이력 HTML 생성
 * @param {string} employeeId - 직원 ID
 */
function renderEmployeeAwardsForCard(employeeId) {
    const awards = getEmployeeAwards(employeeId);
    
    if (awards.length === 0) {
        return '<p style="color: #999; text-align: center;">포상 이력이 없습니다.</p>';
    }
    
 // 수상일 최신순 정렬
    awards.sort((a, b) => (b.awardDate || '').localeCompare(a.awardDate || ''));
    
    return `
        <div class="employee-awards-list">
            ${awards.map(award => {
                const statusColor = AWARD_STATUS_COLORS[award.status] || AWARD_STATUS_COLORS['선정'];
                return `
                    <div class="award-item" style="padding: 10px 0; border-bottom: 1px solid #eee;">
                        <div class="award-title" style="font-weight: 500;">
                            ${award.awardName || ''}
                            <span style="
                                display: inline-block;
                                padding: 2px 8px;
                                border-radius: 10px;
                                font-size: 11px;
                                margin-left: 5px;
                                background: ${statusColor.bg};
                                color: ${statusColor.text};
                            ">${award.status}</span>
                        </div>
                        <div class="award-meta" style="font-size: 12px; color: #666; margin-top: 4px;">
                            ${award.awardDate || ''} | ${award.type || ''} | ${award.honor || ''} | ${award.organization || ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ===== 가져오기 화면 상태 표시 =====

/**
 * 포상 데이터 가져오기 상태 갱신
 */
function refreshAwardsImportStatus() {
    const countEl = document.getElementById('awards-current-count');
    const updatedEl = document.getElementById('awards-last-updated');
    const statusEl = document.getElementById('awards-import-status');
    
    if (!countEl) return;
    
    try {
        const data = awardsManager.data;
        const count = data.awards?.length || 0;
        const lastUpdated = data.metadata?.lastUpdated;
        
 // 건수 표시
        if (count > 0) {
            countEl.innerHTML = `<strong style="color: #2E7D32;">${count}건</strong> 등록됨`;
            if (statusEl) statusEl.style.borderLeftColor = '#4CAF50';
        } else {
            countEl.innerHTML = `<span style="color: #999;">데이터 없음</span>`;
            if (statusEl) statusEl.style.borderLeftColor = '#6c757d';
        }
        
 // 마지막 업데이트 시간
        if (updatedEl) {
            if (lastUpdated) {
                const date = new Date(lastUpdated);
                const formatted = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
                updatedEl.textContent = `마지막 업데이트: ${formatted}`;
            } else {
                updatedEl.textContent = '';
            }
        }
        
 // 상세 통계 (내부/외부)
        if (count > 0) {
            const internal = data.awards.filter(a => a.type === '내부').length;
            const external = data.awards.filter(a => a.type === '외부').length;
            const uniqueNames = [...new Set(data.awards.map(a => a.name))].length;
            
            countEl.innerHTML += ` <span style="color: #666; font-size: 11px;">(내부 ${internal} / 외부 ${external}, ${uniqueNames}명)</span>`;
        }
        
    } catch (e) {
        countEl.innerHTML = `<span style="color: #F44336;">오류</span>`;
        console.error('포상 상태 갱신 오류:', e);
    }
}

// 가져오기 모듈 로드 시 상태 자동 갱신
// (네비게이션에서 import 모듈 로드 시 호출)
if (typeof window !== 'undefined') {
 // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', function() {
 // 약간 지연 후 실행 (모듈 로드 후)
        setTimeout(refreshAwardsImportStatus, 500);
    });
}

