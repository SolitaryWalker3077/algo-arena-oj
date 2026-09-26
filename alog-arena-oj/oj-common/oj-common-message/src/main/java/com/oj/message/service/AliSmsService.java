package com.oj.message.service;

import com.alibaba.fastjson2.JSON;


import com.aliyun.dypnsapi20170525.Client;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeRequest;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeResponse;
import com.aliyun.dypnsapi20170525.models.SendSmsVerifyCodeResponseBody;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;


@Component
@Slf4j
public class AliSmsService {

    @Autowired
    private Client aliClient;

    //业务配置
    @Value("${sms.aliyun.templateCode:}")
    private String templateCode;

    @Value("${sms.aliyun.sign-name:}")
    private String signName;

    /**
     * 发送短信验证码
     *
     * @param phone
     * @param code
     */
    public boolean sendMobileCode(String phone, String code) {
        Map<String, String> params = new HashMap<>();
        params.put("code", code);
        params.put("min","5");
        return sendTempMessage(phone, signName, templateCode, params);
    }

    /**
     * 发送模板消息
     *
     * @param phone
     * @param singName
     * @param templateCode
     * @param params
     */
    public boolean sendTempMessage(String phone, String singName, String templateCode,
                                   Map<String, String> params) {
        SendSmsVerifyCodeRequest request = new SendSmsVerifyCodeRequest();
        request.setPhoneNumber(phone);
        request.setSignName(signName);
        request.setTemplateCode(templateCode);
        request.setTemplateParam(JSON.toJSONString(params));
        try {
            SendSmsVerifyCodeResponse response = aliClient.sendSmsVerifyCode(request);
            SendSmsVerifyCodeResponseBody responseBody = response.getBody();
            if (!"OK".equalsIgnoreCase(responseBody.getCode())) {
                log.error(
                        "短信发送失败，请求参数：{}，错误码：{}，错误信息：{}",
                        JSON.toJSONString(request),
                        responseBody.getCode(),
                        responseBody.getMessage()
                );
                return false;
            }
            log.info(
                    "短信发送成功，手机号：{}，返回结果：{}",
                    phone,
                    JSON.toJSONString(responseBody)
            );
            return true;
        }  catch (Exception e) {
            log.error(
                    "短信发送异常，请求参数：{}，异常信息：{}",
                    JSON.toJSONString(request),
                    e.getMessage(),
                    e
            );
            return false;
        }
    }
}
