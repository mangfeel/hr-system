/**
 * supabase_인사.js
 * Supabase 연결 설정
 */

const SUPABASE_URL = 'https://pulanyznvpsrlkpqotat.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tXxl6Y8rJ6kQ13nTut95lg_AkWl8ErZ';

// Supabase 클라이언트 초기화 (세션: 탭 닫으면 만료)
const supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storageKey: 'hr-auth',
        storage: window.sessionStorage
    }
});