/**
 * preload.js - Electron 보안 브릿지
 * 
 * 렌더러 프로세스와 메인 프로세스 간의 안전한 통신을 위한 브릿지
 * - contextBridge를 통해 안전한 API만 노출
 * - Node.js 직접 접근 차단
 * 
 * @version 1.0.0
 * @since 2026-01-23
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

console.log('[Preload] preload.js 로드 완료');
console.log('[Preload] electronAPI 노출됨');
