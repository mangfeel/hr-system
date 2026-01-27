import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'user_id가 필요합니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Service Role Key로 Supabase Admin 클라이언트 생성
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. 관련 라이선스 삭제
    const { error: licenseError } = await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('user_id', user_id)

    if (licenseError) {
      console.warn('라이선스 삭제 경고:', licenseError)
    }

    // 2. 프로필 삭제
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id)

    if (profileError) {
      console.warn('프로필 삭제 경고:', profileError)
    }

    // 3. Auth 사용자 삭제 (없으면 무시)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (authError) {
      // User not found는 무시 (이미 삭제된 경우)
      if (!authError.message.includes('not found')) {
        console.warn('Auth 사용자 삭제 경고:', authError.message)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '사용자가 완전히 삭제되었습니다.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('삭제 오류:', error)
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
