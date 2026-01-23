/**
 * main.js - Electron 메인 프로세스
 * 
 * 인사관리시스템 데스크톱 앱의 메인 프로세스
 * - 앱 윈도우 생성 및 관리
 * - IPC 통신 핸들러
 * - electron-store 기반 데이터 저장
 * - 자동 업데이트
 * 
 * @version 3.0.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v3.0.0 (2026-01-23) - 7단계: 자동 업데이트 추가
 *   - electron-updater 연동
 *   - 업데이트 확인/다운로드/설치 기능
 *   - 업데이트 상태 IPC 핸들러 추가
 * 
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

// ===== 자동 업데이트 설정 =====

const { autoUpdater } = require('electron-updater');

// 업데이트 로그 설정
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// 자동 다운로드 비활성화 (사용자 확인 후 다운로드)
autoUpdater.autoDownload = false;

// 자동 설치 비활성화 (사용자 확인 후 설치)
autoUpdater.autoInstallOnAppQuit = true;

// ===== 전역 변수 =====

/** @type {BrowserWindow} 메인 윈도우 */
let mainWindow = null;

/** @type {boolean} 개발 모드 여부 */
const isDev = !app.isPackaged;

/** @type {Object} 업데이트 정보 */
let updateInfo = null;

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
        
        // 프로덕션 모드에서만 업데이트 확인
        if (!isDev) {
            setTimeout(() => {
                checkForUpdates();
            }, 3000);  // 앱 로드 후 3초 뒤 업데이트 확인
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

// ===== 자동 업데이트 함수 =====

/**
 * 업데이트 확인
 */
function checkForUpdates() {
    console.log('[Updater] 업데이트 확인 시작...');
    autoUpdater.checkForUpdates().catch(err => {
        console.error('[Updater] 업데이트 확인 오류:', err);
    });
}

// 업데이트 확인 중
autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] 업데이트 확인 중...');
    sendUpdateStatus('checking');
});

// 업데이트 있음
autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 업데이트 발견:', info.version);
    updateInfo = info;
    sendUpdateStatus('available', info);
    
    // 사용자에게 업데이트 알림
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 알림',
        message: `새 버전이 있습니다! (v${info.version})`,
        detail: '지금 다운로드하시겠습니까?',
        buttons: ['다운로드', '나중에'],
        defaultId: 0
    }).then(result => {
        if (result.response === 0) {
            // 다운로드 시작
            autoUpdater.downloadUpdate();
        }
    });
});

// 업데이트 없음
autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 최신 버전입니다.');
    sendUpdateStatus('not-available', info);
});

// 다운로드 진행률
autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`[Updater] 다운로드 중... ${percent}%`);
    sendUpdateStatus('downloading', { percent });
    
    // 윈도우 타이틀에 진행률 표시
    if (mainWindow) {
        mainWindow.setTitle(`인사관리시스템 - 업데이트 다운로드 중 ${percent}%`);
    }
});

// 다운로드 완료
autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 다운로드 완료:', info.version);
    sendUpdateStatus('downloaded', info);
    
    // 윈도우 타이틀 복원
    if (mainWindow) {
        mainWindow.setTitle('인사관리시스템');
    }
    
    // 사용자에게 재시작 알림
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 준비 완료',
        message: '업데이트가 다운로드되었습니다.',
        detail: '앱을 재시작하여 업데이트를 적용하시겠습니까?',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0
    }).then(result => {
        if (result.response === 0) {
            // 재시작하여 업데이트 적용
            autoUpdater.quitAndInstall();
        }
    });
});

// 업데이트 오류
autoUpdater.on('error', (err) => {
    console.error('[Updater] 오류:', err);
    sendUpdateStatus('error', { message: err.message });
});

/**
 * 렌더러 프로세스로 업데이트 상태 전송
 */
function sendUpdateStatus(status, data = null) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-status', { status, data });
    }
}

// ===== 앱 이벤트 =====

// 앱 준비 완료
app.whenReady().then(() => {
    console.log('[Main] 앱 시작');
    console.log('[Main] 앱 버전:', app.getVersion());
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

// ===== IPC 핸들러: 자동 업데이트 =====

/**
 * 수동 업데이트 확인
 */
ipcMain.handle('check-for-updates', () => {
    if (isDev) {
        return { success: false, message: '개발 모드에서는 업데이트를 확인할 수 없습니다.' };
    }
    checkForUpdates();
    return { success: true, message: '업데이트 확인 중...' };
});

/**
 * 업데이트 다운로드
 */
ipcMain.handle('download-update', () => {
    if (updateInfo) {
        autoUpdater.downloadUpdate();
        return { success: true };
    }
    return { success: false, message: '다운로드할 업데이트가 없습니다.' };
});

/**
 * 업데이트 설치 (재시작)
 */
ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
});

/**
 * 현재 앱 버전 조회
 */
ipcMain.handle('get-app-version', () => {
    return {
        version: app.getVersion(),
        isDev: isDev
    };
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

console.log('[Main] main.js 로드 완료 (v3.0.0)');
