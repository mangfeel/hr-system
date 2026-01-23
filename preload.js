/**
 * preload.js - Electron 보안 브릿지
 * 
 * 렌더러 프로세스와 메인 프로세스 간의 안전한 통신을 위한 브릿지
 * - contextBridge를 통해 안전한 API만 노출
 * - Node.js 직접 접근 차단
 * - electron-store 접근 API 제공
 * 
 * @version 2.0.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v2.0.0 (2026-01-23) - 3단계: 로컬 데이터 저장 전환
 *   - store.get, store.set, store.delete 추가
 *   - store.getAll, store.clear 추가
 *   - store.getPath 추가
 * 
 * v1.0.0 (2026-01-23) - 1단계: 기본 설정
 *   - 기본 API (앱 정보, 페이지 이동, 다이얼로그, 파일 시스템)
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 렌더러에 노출할 안전한 API
 * window.electronAPI 로 접근 가능
 */
contextBridge.exposeInMainWorld('electronAPI', {
    
    // ===== electron-store (데이터 저장) =====
    
    /**
     * 데이터 저장
     * @param {string} key - 저장 키
     * @param {any} value - 저장할 값
     * @returns {Promise<Object>} { success, error? }
     * 
     * @example
     * await electronAPI.store.set('hr_system_v25_db', data);
     */
    store: {
        set: (key, value) => ipcRenderer.invoke('store-set', key, value),
        
        /**
         * 데이터 불러오기
         * @param {string} key - 조회 키
         * @returns {Promise<Object>} { success, data?, error? }
         * 
         * @example
         * const result = await electronAPI.store.get('hr_system_v25_db');
         * if (result.success) console.log(result.data);
         */
        get: (key) => ipcRenderer.invoke('store-get', key),
        
        /**
         * 데이터 삭제
         * @param {string} key - 삭제할 키
         * @returns {Promise<Object>} { success, error? }
         */
        delete: (key) => ipcRenderer.invoke('store-delete', key),
        
        /**
         * 전체 데이터 불러오기
         * @returns {Promise<Object>} { success, data?, error? }
         */
        getAll: () => ipcRenderer.invoke('store-get-all'),
        
        /**
         * 전체 데이터 초기화
         * @returns {Promise<Object>} { success, error? }
         */
        clear: () => ipcRenderer.invoke('store-clear'),
        
        /**
         * 저장소 경로 조회
         * @returns {Promise<Object>} { success, path, userData }
         */
        getPath: () => ipcRenderer.invoke('store-get-path')
    },
    
    // ===== 앱 정보 =====
    
    /**
     * 앱 정보 조회
     * @returns {Promise<Object>} { version, name, path, userData, storePath, isDev }
     */
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // ===== 페이지 이동 =====
    
    /**
     * 페이지 이동
     * @param {string} page - 이동할 페이지 ('login.html' | '메인_인사.html')
     * @returns {Promise<Object>} { success, error? }
     */
    navigateTo: (page) => ipcRenderer.invoke('navigate-to', page),
    
    // ===== 다이얼로그 =====
    
    /**
     * 메시지 다이얼로그 표시
     * @param {Object} options - { type, title, message, detail, buttons }
     * @returns {Promise<Object>} { response, checkboxChecked }
     */
    showMessage: (options) => ipcRenderer.invoke('show-message', options),
    
    /**
     * 파일 저장 다이얼로그
     * @param {Object} options - { title, defaultPath, filters }
     * @returns {Promise<Object>} { canceled, filePath }
     */
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    
    /**
     * 파일 열기 다이얼로그
     * @param {Object} options - { title, properties, filters }
     * @returns {Promise<Object>} { canceled, filePaths }
     */
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    
    // ===== 파일 시스템 =====
    
    /**
     * 파일 쓰기
     * @param {string} filePath - 파일 경로
     * @param {string} data - 저장할 데이터
     * @returns {Promise<Object>} { success, error? }
     */
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    
    /**
     * 파일 읽기
     * @param {string} filePath - 파일 경로
     * @returns {Promise<Object>} { success, data?, error? }
     */
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // ===== 앱 제어 =====
    
    /**
     * 앱 종료
     */
    quitApp: () => ipcRenderer.invoke('quit-app'),
    
    // ===== Electron 환경 확인 =====
    
    /**
     * Electron 환경 여부 확인
     * @returns {boolean}
     */
    isElectron: () => true
});

/**
 * 렌더러에서 Electron 환경 확인용
 * window.isElectron 으로 접근 가능
 */
contextBridge.exposeInMainWorld('isElectron', true);

console.log('[Preload] preload.js 로드 완료 (v2.0.0)');
console.log('[Preload] electronAPI 노출됨 (store 포함)');
