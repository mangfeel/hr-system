/**
 * preload.js - Electron 보안 브릿지
 * 
 * 렌더러 프로세스와 메인 프로세스 간의 안전한 통신을 위한 브릿지
 * - contextBridge를 통해 안전한 API만 노출
 * - Node.js 직접 접근 차단
 * 
 * @version 2.2.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v2.2.0 (2026-02-06) - 윈도우 포커스 복원 API 추가
 *   - focusWindow API 추가
 *   - 직원 등록/삭제 후 입력란 포커스 문제 해결
 *
 * v2.1.0 (2026-02-04) - 브라우저 인쇄 지원
 *   - openInBrowser API 추가
 * 
 * v2.0.0 (2026-01-23) - 7단계: 자동 업데이트 API 추가
 *   - checkForUpdates, downloadUpdate, installUpdate
 *   - getAppVersion
 *   - onUpdateStatus 이벤트 리스너
 * 
 * v1.0.0 (2026-01-23) - 1단계: 기본 설정
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 렌더러에 노출할 안전한 API
 * window.electronAPI 로 접근 가능
 */
contextBridge.exposeInMainWorld('electronAPI', {
    
    // ===== 앱 정보 =====
    
    /**
     * 앱 정보 조회
     * @returns {Promise<Object>} { version, name, path, userData, isDev }
     */
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    /**
     * 앱 버전 조회
     * @returns {Promise<Object>} { version, isDev }
     */
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // ===== 자동 업데이트 =====
    
    /**
     * 업데이트 확인
     * @returns {Promise<Object>} { success, message? }
     */
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    
    /**
     * 업데이트 다운로드
     * @returns {Promise<Object>} { success, message? }
     */
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    
    /**
     * 업데이트 설치 (앱 재시작)
     */
    installUpdate: () => ipcRenderer.invoke('install-update'),
    
    /**
     * 업데이트 상태 이벤트 리스너
     * @param {Function} callback - 상태 변경 시 호출될 콜백
     *   callback({ status, data }) 
     *   status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
     */
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, info) => {
            callback(info);
        });
    },
    
    /**
     * 업데이트 상태 이벤트 리스너 제거
     */
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-status');
    },
    
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
    
    // ===== 브라우저로 열기 =====
    
    /**
     * HTML 내용을 시스템 브라우저로 열기 (인쇄용)
     * @param {string} htmlContent - HTML 내용
     * @param {string} filename - 파일명 (기본: print_temp.html)
     * @returns {Promise<Object>} { success, path?, error? }
     */
    openInBrowser: (htmlContent, filename) => ipcRenderer.invoke('open-in-browser', htmlContent, filename),
    
    // ===== 앱 제어 =====
    
    /**
     * 앱 종료
     */
    quitApp: () => ipcRenderer.invoke('quit-app'),
    
    /**
     * 윈도우 포커스 복원 (v2.2.0)
     * 직원 등록/삭제 후 입력란 포커스 복원용
     * @returns {Promise<Object>} { success }
     */
    focusWindow: () => ipcRenderer.invoke('focus-window'),
    
    // ===== Electron 환경 확인 =====
    
    /**
     * Electron 환경 여부 확인
     * @returns {boolean}
     */
    isElectron: () => true
});

/**
 * electron-store API
 * window.electronStore 로 접근 가능
 */
contextBridge.exposeInMainWorld('electronStore', {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    getAll: () => ipcRenderer.invoke('store-get-all'),
    clear: () => ipcRenderer.invoke('store-clear'),
    getPath: () => ipcRenderer.invoke('store-get-path')
});

/**
 * 렌더러에서 Electron 환경 확인용
 * window.isElectron 으로 접근 가능
 */
contextBridge.exposeInMainWorld('isElectron', true);

console.log('[Preload] preload.js 로드 완료 (v2.2.0)');
console.log('[Preload] electronAPI, electronStore 노출됨');
