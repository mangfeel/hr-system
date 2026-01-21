/**
 * auth_인사.js
 * 인증 및 승인 처리
 */

const Auth_인사 = {
    currentUser: null,
    
    async init() {
        const { data: { session } } = await supabaseAuth.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            return await this.checkApprovalStatus();
        }
        return false;
    },
    
    async signUp(email, password, name, organization, phone) {
        try {
            const { data, error } = await supabaseAuth.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            const { error: profileError } = await supabaseAuth
                .from('profiles')
                .insert({
                    id: data.user.id,
                    email: email,
                    name: name,
                    organization: organization,
                    phone: phone || '',
                    status: 'pending'
                });
            
            if (profileError) throw profileError;
            
            return { success: true, message: '가입 신청이 완료되었습니다.\n관리자 승인 후 이용 가능합니다.' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseAuth.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            
            const isApproved = await this.checkApprovalStatus();
            if (!isApproved) {
                await this.signOut();
                return { success: false, message: '아직 관리자 승인이 완료되지 않았습니다.' };
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        }
    },
    
    async signOut() {
        await supabaseAuth.auth.signOut();
        this.currentUser = null;
        window.location.href = 'login.html';
    },
    
    async checkApprovalStatus() {
        if (!this.currentUser) return false;
        
        const { data, error } = await supabaseAuth
            .from('profiles')
            .select('status')
            .eq('id', this.currentUser.id)
            .single();
        
        if (error || !data) return false;
        return data.status === 'approved';
    },
    
    async getProfile() {
        if (!this.currentUser) return null;
        
        const { data, error } = await supabaseAuth
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        if (error) return null;
        return data;
    }
};