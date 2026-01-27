import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = "re_NxrBVR7z_SXDE9gkzjnJEFh89GjFAmetx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to_email, license_key, organization, plan_type, expires_at } = await req.json();

    // 필수 값 검증
    if (!to_email || !license_key) {
      return new Response(
        JSON.stringify({ success: false, message: "이메일과 라이선스 키가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 만료일 포맷
    const expireDate = new Date(expires_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // 이메일 내용
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .license-box { background: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .license-key { font-family: 'Consolas', monospace; font-size: 24px; letter-spacing: 3px; color: #667eea; font-weight: bold; }
          .info-table { width: 100%; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .info-table td:first-child { font-weight: bold; width: 100px; }
          .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 SW HRM 라이선스 발급</h1>
          </div>
          <div class="content">
            <p>안녕하세요, <strong>${organization || '고객'}</strong>님!</p>
            <p>SW HRM 인사관리시스템의 라이선스가 발급되었습니다.</p>
            
            <div class="license-box">
              <p style="margin: 0 0 10px 0; color: #666;">라이선스 키</p>
              <div class="license-key">${license_key}</div>
            </div>
            
            <table class="info-table">
              <tr>
                <td>기관명</td>
                <td>${organization || '-'}</td>
              </tr>
              <tr>
                <td>플랜</td>
                <td>${plan_type}</td>
              </tr>
              <tr>
                <td>만료일</td>
                <td>${expireDate}</td>
              </tr>
            </table>
            
            <div class="warning">
              ⚠️ 이 라이선스 키는 1대의 PC에서만 사용 가능합니다.<br>
              다른 사람과 공유하지 마세요.
            </div>
            
            <p style="margin-top: 20px;">
              프로그램 사용 중 문의사항이 있으시면 카카오톡 오픈채팅으로 연락주세요.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 SW HRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Resend API 호출
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SW HRM <onboarding@resend.dev>",
        to: [to_email],
        subject: `[SW HRM] 라이선스가 발급되었습니다 - ${organization || ''}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message: "이메일이 전송되었습니다.", id: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Resend API 오류:", result);
      return new Response(
        JSON.stringify({ success: false, message: result.message || "이메일 전송 실패" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("오류:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
