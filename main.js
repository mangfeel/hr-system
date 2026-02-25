/**
 * main.js - Electron 메인 프로세스
 * 
 * 인사관리시스템 데스크톱 앱의 메인 프로세스
 * - 앱 윈도우 생성 및 관리
 * - IPC 통신 핸들러
 * - electron-store 기반 데이터 저장
 * - 자동 업데이트
 * 
 * @version 3.6.0
 * @since 2026-01-23
 * 
 * [변경 이력]
 * v3.6.0 (2026-02-25) - 보안 강화: sandbox 명시 + CSP 적용
 *   - webPreferences에 sandbox: true 명시적 추가
 *
 * v3.5.0 (2026-02-25) - IPC 파일 시스템 경로 보안 강화
 *   - write-file, read-file 핸들러에 시스템 보호 폴더 차단 추가
 *   - Windows, Program Files 등 시스템 경로 쓰기/읽기 차단
 *
 * v3.4.0 (2026-02-13) - 자동 백업 시스템 추가
 *   - 앱 시작 시 7일 경과 여부 확인 후 자동 백업
 *   - .hrm 형식 (수동 백업과 동일한 인코딩)
 *   - AppData/hr-system/backups/ 에 저장
 *   - 최근 7개만 보관, 오래된 백업 자동 삭제
 *
 * v3.3.0 (2026-02-06) - 윈도우 포커스 복원 API 추가
 *   - focus-window IPC 핸들러 추가
 *   - 직원 등록/삭제 후 입력란 포커스 문제 해결
 *
 * v3.2.1 (2026-02-04) - 임시 파일 자동 정리
 *   - 앱 종료 시 인쇄용 임시 HTML 파일 자동 삭제
 *   - tempFiles 배열로 임시 파일 경로 관리
 * 
 * v3.2.0 (2026-02-04) - 브라우저 인쇄 지원
 *   - open-in-browser IPC 핸들러 추가
 *   - HTML 임시 파일 생성 후 시스템 브라우저로 열기
 * 
 * v3.1.0 (2026-01-28) - 업데이트 진행률 UI 개선
 *   - 진행률 팝업창 추가
 *   - 작업표시줄 진행률 표시
 *   - 다운로드 MB 표시
 * 
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

// ===== 자동 백업 시스템 (v3.4.0) =====

/**
 * 자동 백업 설정
 */
const AUTO_BACKUP = {
    INTERVAL_DAYS: 7,       // 백업 주기 (일)
    MAX_BACKUPS: 7,         // 최대 보관 개수
    FOLDER_NAME: 'backups'  // 백업 폴더명
};

/**
 * 백업 폴더 경로 반환
 * @returns {string} AppData/hr-system/backups/
 */
function getBackupDir() {
    return path.join(app.getPath('userData'), AUTO_BACKUP.FOLDER_NAME);
}

/**
 * 백업 데이터 인코딩 (.hrm 형식 - 백업_인사.js와 동일 알고리즘)
 * JSON → Base64 → 역순 → 청크 섞기 → 헤더 추가
 * @param {Object} data - 백업 데이터 객체
 * @returns {string} 인코딩된 문자열
 */
function encodeBackupData(data) {
    // 1. JSON 문자열화
    const jsonStr = JSON.stringify(data);
    
    // 2. UTF-8 → Base64 인코딩 (Node.js Buffer 사용)
    const base64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
    
    // 3. 바이트 순서 뒤집기
    const reversed = base64.split('').reverse().join('');
    
    // 4. 원본 길이 저장
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
}

/**
 * 자동 백업 실행 (앱 시작 시 호출)
 * - 마지막 백업으로부터 7일 경과 시 실행
 * - 직원 데이터가 있는 경우에만 실행
 * - .hrm 형식으로 저장 (수동 백업과 동일)
 */
function runAutoBackup() {
    try {
        const backupDir = getBackupDir();
        
        // 백업 폴더 생성
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // 마지막 백업 날짜 확인
        const lastBackup = store.get('_autoBackupLastDate');
        if (lastBackup) {
            const daysSince = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince < AUTO_BACKUP.INTERVAL_DAYS) {
                console.log(`[AutoBackup] 마지막 백업 ${daysSince}일 전 - 스킵 (${AUTO_BACKUP.INTERVAL_DAYS}일 주기)`);
                return;
            }
        }
        
        // 데이터 확인
        const allData = store.store;
        const employees = allData?.hr_system_v25_db?.employees;
        if (!employees || employees.length === 0) {
            console.log('[AutoBackup] 직원 데이터 없음 - 스킵');
            return;
        }
        
        // 파일명 생성
        const today = new Date().toISOString().split('T')[0];
        const filename = `auto_backup_${today}.hrm`;
        const filePath = path.join(backupDir, filename);
        
        // 같은 날 백업이 이미 있으면 스킵
        if (fs.existsSync(filePath)) {
            console.log('[AutoBackup] 오늘 백업 이미 존재 - 스킵');
            store.set('_autoBackupLastDate', new Date().toISOString());
            return;
        }
        
        // 백업 데이터 구성 (수동 백업과 동일 구조)
        const backupData = {
            _backupInfo: {
                version: '3.2',
                createdAt: new Date().toISOString(),
                type: 'auto_backup',
                appVersion: app.getVersion(),
                employeeCount: employees.length
            },
            database: allData.hr_system_v25_db || {},
            systemSettings: {}
        };
        
        // 시스템 설정 수집
        const settingKeys = [
            'hr_concurrent_positions',
            'hr_org_chart_settings',
            'tenureReport_specialDepts',
            'hr_awards_data',
            'hr_salary_grades',
            'hr_salary_tables',
            'hr_salary_settings',
            'hr_ordinary_wage_settings',
            'hr_position_allowances',
            'hr_salary_basic_settings',
            'hr_overtime_settings',
            'hr_overtime_records'
        ];
        
        settingKeys.forEach(key => {
            const value = store.get(key);
            if (value) {
                backupData.systemSettings[key] = value;
            }
        });
        
        // .hrm 형식으로 인코딩 후 저장
        const encoded = encodeBackupData(backupData);
        fs.writeFileSync(filePath, encoded, 'utf-8');
        
        // 마지막 백업 날짜 기록
        store.set('_autoBackupLastDate', new Date().toISOString());
        
        const fileSize = fs.statSync(filePath).size;
        console.log(`[AutoBackup] 백업 완료: ${filename} (${(fileSize / 1024).toFixed(1)}KB, 직원 ${employees.length}명)`);
        
        // 오래된 백업 정리
        cleanOldBackups();
        
    } catch (error) {
        console.error('[AutoBackup] 백업 실패:', error.message);
    }
}

/**
 * 오래된 백업 파일 삭제 (최근 7개만 유지)
 */
function cleanOldBackups() {
    try {
        const backupDir = getBackupDir();
        if (!fs.existsSync(backupDir)) return;
        
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('auto_backup_') && f.endsWith('.hrm'))
            .sort()
            .reverse();  // 최신순
        
        if (files.length > AUTO_BACKUP.MAX_BACKUPS) {
            const toDelete = files.slice(AUTO_BACKUP.MAX_BACKUPS);
            toDelete.forEach(f => {
                fs.unlinkSync(path.join(backupDir, f));
                console.log('[AutoBackup] 오래된 백업 삭제:', f);
            });
        }
    } catch (error) {
        console.error('[AutoBackup] 정리 실패:', error.message);
    }
}

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

/** @type {BrowserWindow} 업데이트 진행률 윈도우 */
let progressWindow = null;

/** @type {boolean} 개발 모드 여부 */
const isDev = !app.isPackaged;

/** @type {Object} 업데이트 정보 */
let updateInfo = null;

/** @type {string[]} 임시 파일 경로 목록 (앱 종료 시 삭제) */
let tempFiles = [];

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
            sandbox: true,                   // 보안: 렌더러 샌드박스 (v3.6.0)
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
 * 업데이트 진행률 윈도우 생성
 */
function createProgressWindow() {
    if (progressWindow && !progressWindow.isDestroyed()) {
        progressWindow.focus();
        return;
    }
    
    progressWindow = new BrowserWindow({
        width: 400,
        height: 150,
        parent: mainWindow,
        modal: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    // 진행률 HTML 로드
    const progressHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Malgun Gothic', sans-serif;
                background: rgba(255, 255, 255, 0.98);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 24px;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin-bottom: 16px;
                text-align: center;
            }
            .progress-container {
                background: #e9ecef;
                border-radius: 8px;
                height: 24px;
                overflow: hidden;
                margin-bottom: 12px;
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px;
                transition: width 0.3s ease;
                width: 0%;
            }
            .progress-text {
                text-align: center;
                font-size: 13px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="title">🔄 업데이트 다운로드 중...</div>
        <div class="progress-container">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        <div class="progress-text" id="progressText">0% (0 / 0 MB)</div>
        <script>
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('update-progress', (event, data) => {
                document.getElementById('progressBar').style.width = data.percent + '%';
                document.getElementById('progressText').textContent = 
                    data.percent + '% (' + data.mbDownloaded + ' / ' + data.mbTotal + ' MB)';
            });
        </script>
    </body>
    </html>
    `;
    
    progressWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(progressHtml));
    
    progressWindow.on('closed', () => {
        progressWindow = null;
    });
    
    console.log('[Updater] 진행률 윈도우 생성');
}

/**
 * 업데이트 진행률 윈도우 닫기
 */
function closeProgressWindow() {
    if (progressWindow && !progressWindow.isDestroyed()) {
        progressWindow.close();
        progressWindow = null;
    }
    // 작업표시줄 진행률 초기화
    if (mainWindow) {
        mainWindow.setProgressBar(-1);
    }
}

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
            // 진행률 윈도우 표시
            createProgressWindow();
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
    const mbDownloaded = (progress.transferred / 1024 / 1024).toFixed(1);
    const mbTotal = (progress.total / 1024 / 1024).toFixed(1);
    console.log(`[Updater] 다운로드 중... ${percent}% (${mbDownloaded}/${mbTotal} MB)`);
    sendUpdateStatus('downloading', { percent });
    
    if (mainWindow) {
        // 윈도우 타이틀에 진행률 표시
        mainWindow.setTitle(`인사관리시스템 - 업데이트 다운로드 중 ${percent}%`);
        
        // 작업표시줄 진행률 표시
        mainWindow.setProgressBar(progress.percent / 100);
    }
    
    // 진행률 윈도우 업데이트
    if (progressWindow && !progressWindow.isDestroyed()) {
        progressWindow.webContents.send('update-progress', {
            percent,
            mbDownloaded,
            mbTotal
        });
    }
});

// 다운로드 완료
autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 다운로드 완료:', info.version);
    sendUpdateStatus('downloaded', info);
    
    // 진행률 윈도우 닫기
    closeProgressWindow();
    
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
    
    // 진행률 윈도우 닫기
    closeProgressWindow();
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
    
    // 자동 백업 (v3.4.0)
    runAutoBackup();
    
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

// 앱 종료 전 임시 파일 정리
app.on('before-quit', () => {
    console.log('[Main] 앱 종료 - 임시 파일 정리 시작');
    
    tempFiles.forEach(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('[Main] 임시 파일 삭제:', filePath);
            }
        } catch (err) {
            console.warn('[Main] 임시 파일 삭제 실패:', filePath, err.message);
        }
    });
    
    tempFiles = [];  // 배열 초기화
    console.log('[Main] 임시 파일 정리 완료');
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
 * 시스템 보호 폴더 목록 (write/read 차단)
 * @type {string[]}
 */
const BLOCKED_PATHS = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'];

/**
 * 경로가 시스템 보호 폴더인지 검사
 * @param {string} filePath - 검사할 파일 경로
 * @returns {boolean} 차단 대상이면 true
 */
function isBlockedPath(filePath) {
    const normalized = path.resolve(filePath).toLowerCase();
    return BLOCKED_PATHS.some(bp => normalized.startsWith(bp.toLowerCase()));
}

/**
 * 파일 쓰기
 */
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        if (isBlockedPath(filePath)) {
            console.warn('[Main] 차단된 경로 쓰기 시도:', filePath);
            return { success: false, error: '시스템 보호 폴더에는 파일을 저장할 수 없습니다.' };
        }
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
        if (isBlockedPath(filePath)) {
            console.warn('[Main] 차단된 경로 읽기 시도:', filePath);
            return { success: false, error: '시스템 보호 폴더의 파일은 읽을 수 없습니다.' };
        }
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

/**
 * 윈도우 포커스 (v3.3.0)
 * Electron에서 윈도우 포커스 복원
 */
ipcMain.handle('focus-window', () => {
    if (mainWindow) {
        // blur 후 focus 트릭 (외부 클릭 후 재클릭 효과)
        mainWindow.blur();
        setTimeout(() => {
            mainWindow.focus();
            mainWindow.webContents.focus();
            console.log('[Main] 윈도우 포커스 복원');
        }, 50);
        return { success: true };
    }
    return { success: false };
});

// ===== IPC 핸들러: 브라우저로 열기 =====

/**
 * HTML 내용을 임시 파일로 저장하고 시스템 브라우저로 열기
 * @param {string} htmlContent - HTML 내용
 * @param {string} filename - 파일명 (기본: print_temp.html)
 */
ipcMain.handle('open-in-browser', async (event, htmlContent, filename = 'print_temp.html') => {
    try {
        const os = require('os');
        const { shell } = require('electron');
        
        // 임시 폴더에 파일 생성 (영문 경로 사용)
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'hr_print_' + Date.now() + '.html');
        
        fs.writeFileSync(tempFile, htmlContent, 'utf8');
        console.log('[Main] 임시 파일 생성:', tempFile);
        
        // 임시 파일 목록에 추가 (앱 종료 시 삭제용)
        tempFiles.push(tempFile);
        
        // 시스템 기본 브라우저로 열기 (shell.openPath 사용)
        const result = await shell.openPath(tempFile);
        
        if (result) {
            // result가 있으면 오류 발생
            console.error('[Main] 브라우저 열기 오류:', result);
            return { success: false, error: result };
        }
        
        console.log('[Main] 브라우저로 열기 완료');
        return { success: true, path: tempFile };
    } catch (error) {
        console.error('[Main] 브라우저로 열기 오류:', error);
        return { success: false, error: error.message };
    }
});

// ===== 에러 핸들링 =====

process.on('uncaughtException', (error) => {
    console.error('[Main] 예외 발생:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Promise 거부:', reason);
});

console.log('[Main] main.js 로드 완료 (v3.6.0)');
