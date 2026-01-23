/**
 * main.js - Electron 메인 프로세스
 * 
 * 인사관리시스템 데스크톱 앱의 메인 프로세스
 * - 앱 윈도우 생성 및 관리
 * - IPC 통신 핸들러
 * - electron-store 기반 데이터 저장
 * - 자동 업데이트 (향후)
 * 
 * @version 2.0.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v2.0.0 (2026-01-23) - 3단계: 로컬 데이터 저장 전환
 *   - electron-store 추가
 *   - store-get, store-set, store-delete IPC 핸들러 추가
 *   - store-get-all, store-clear IPC 핸들러 추가
 * 
 * v1.0.0 (2026-01-23) - 1단계: 기본 설정
 *   - 앱 윈도우 생성
 *   - 기본 IPC 핸들러
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ===== electron-store 설정 =====

const Store = require('electron-store');

/**
 * electron-store 인스턴스
 * 데이터는 C:\Users\사용자\AppData\Roaming\hr-system\hr-system-data.json 에 저장됨
 */
const store = new Store({
    name: 'hr-system-data',  // 파일명: hr-system-data.json
    encryptionKey: 'hr-system-encryption-key-2026',  // 암호화 키
    defaults: {
        // 기본 데이터 구조 (데이터베이스_인사.js와 동일)
        hr_system_v25_db: {
            employees: [],
            settings: {
                organizationName: '조직명',
                version: '3.0',
                lastBackup: null,
                nextUniqueCodeNumber: 1
            }
        }
    }
});

console.log('[Main] electron-store 경로:', store.path);

// ===== 전역 변수 =====

/** @type {BrowserWindow} 메인 윈도우 */
let mainWindow = null;

/** @type {boolean} 개발 모드 여부 */
const isDev = !app.isPackaged;

// ===== 윈도우 생성 =====

/**
 * 메인 윈도우 생성
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        title: '인사관리시스템',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        webPreferences: {
            nodeIntegration: false,          // 보안: Node.js 직접 접근 차단
            contextIsolation: true,          // 보안: 컨텍스트 격리
            preload: path.join(__dirname, 'preload.js'),  // 보안 브릿지
            devTools: isDev                  // 개발 모드에서만 DevTools 허용
        },
        // 프레임 설정
        frame: true,
        autoHideMenuBar: true,              // 메뉴바 자동 숨김 (Alt로 표시)
        show: false                          // 준비 완료 후 표시
    });

    // 로그인 페이지 로드
    mainWindow.loadFile('login.html');

    // 준비 완료 후 표시 (깜빡임 방지)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 개발 모드에서 DevTools 열기
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // 윈도우 닫힘 이벤트
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 외부 링크 새 창에서 열기 방지 (보안)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // 외부 URL은 기본 브라우저에서 열기
        if (url.startsWith('http://') || url.startsWith('https://')) {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    console.log('[Main] 윈도우 생성 완료');
}

// ===== 앱 이벤트 =====

// 앱 준비 완료
app.whenReady().then(() => {
    console.log('[Main] 앱 시작');
    console.log('[Main] 개발 모드:', isDev);
    console.log('[Main] 앱 경로:', app.getAppPath());
    console.log('[Main] 데이터 저장 경로:', app.getPath('userData'));
    
    createWindow();

    // macOS: 독 클릭 시 윈도우 재생성
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 모든 윈도우 닫힘 (macOS 제외)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ===== IPC 핸들러: electron-store (데이터 저장) =====

/**
 * 데이터 저장 (키-값)
 */
ipcMain.handle('store-set', (event, key, value) => {
    try {
        store.set(key, value);
        console.log('[Main] store-set:', key);
        return { success: true };
    } catch (error) {
        console.error('[Main] store-set 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 데이터 불러오기 (키로 조회)
 */
ipcMain.handle('store-get', (event, key) => {
    try {
        const value = store.get(key);
        console.log('[Main] store-get:', key, value ? '(데이터 있음)' : '(데이터 없음)');
        return { success: true, data: value };
    } catch (error) {
        console.error('[Main] store-get 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 데이터 삭제 (키로 삭제)
 */
ipcMain.handle('store-delete', (event, key) => {
    try {
        store.delete(key);
        console.log('[Main] store-delete:', key);
        return { success: true };
    } catch (error) {
        console.error('[Main] store-delete 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 전체 데이터 불러오기
 */
ipcMain.handle('store-get-all', (event) => {
    try {
        const allData = store.store;  // 전체 데이터 객체
        console.log('[Main] store-get-all: 전체 데이터 조회');
        return { success: true, data: allData };
    } catch (error) {
        console.error('[Main] store-get-all 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 전체 데이터 초기화
 */
ipcMain.handle('store-clear', (event) => {
    try {
        store.clear();
        console.log('[Main] store-clear: 전체 데이터 초기화');
        return { success: true };
    } catch (error) {
        console.error('[Main] store-clear 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 저장소 경로 조회
 */
ipcMain.handle('store-get-path', (event) => {
    return { 
        success: true, 
        path: store.path,
        userData: app.getPath('userData')
    };
});

// ===== IPC 핸들러: 앱 정보 =====

/**
 * 앱 정보 조회
 */
ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        name: app.getName(),
        path: app.getAppPath(),
        userData: app.getPath('userData'),
        storePath: store.path,
        isDev: isDev
    };
});

/**
 * 페이지 이동 (로그인 → 메인)
 */
ipcMain.handle('navigate-to', (event, page) => {
    if (mainWindow) {
        const validPages = ['login.html', '메인_인사.html'];
        if (validPages.includes(page)) {
            mainWindow.loadFile(page);
            console.log('[Main] 페이지 이동:', page);
            return { success: true };
        } else {
            console.error('[Main] 유효하지 않은 페이지:', page);
            return { success: false, error: '유효하지 않은 페이지' };
        }
    }
    return { success: false, error: '윈도우 없음' };
});

// ===== IPC 핸들러: 다이얼로그 =====

/**
 * 알림 다이얼로그
 */
ipcMain.handle('show-message', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: options.type || 'info',       // 'info', 'warning', 'error', 'question'
        title: options.title || '알림',
        message: options.message || '',
        detail: options.detail || '',
        buttons: options.buttons || ['확인']
    });
    return result;
});

/**
 * 파일 저장 다이얼로그
 */
ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: options.title || '저장',
        defaultPath: options.defaultPath || '',
        filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

/**
 * 파일 열기 다이얼로그
 */
ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options.title || '열기',
        properties: options.properties || ['openFile'],
        filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

// ===== IPC 핸들러: 파일 시스템 =====

/**
 * 파일 쓰기
 */
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, data, 'utf8');
        console.log('[Main] 파일 저장:', filePath);
        return { success: true };
    } catch (error) {
        console.error('[Main] 파일 저장 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 파일 읽기
 */
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        console.log('[Main] 파일 읽기:', filePath);
        return { success: true, data: data };
    } catch (error) {
        console.error('[Main] 파일 읽기 오류:', error);
        return { success: false, error: error.message };
    }
});

/**
 * 앱 종료
 */
ipcMain.handle('quit-app', () => {
    app.quit();
});

// ===== 에러 핸들링 =====

process.on('uncaughtException', (error) => {
    console.error('[Main] 예외 발생:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Promise 거부:', reason);
});

console.log('[Main] main.js 로드 완료 (v2.0.0)');
