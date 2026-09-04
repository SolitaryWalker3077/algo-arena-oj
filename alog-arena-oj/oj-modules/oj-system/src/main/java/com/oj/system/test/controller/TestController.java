package com.oj.system.test.controller;

import com.oj.redis.service.RedisService;
import com.oj.system.entity.SysUserInfo;
import com.oj.system.test.service.ITestService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/test")
@Slf4j
public class TestController {
    @Autowired
    private ITestService iTestService;

    @Autowired
    private RedisService redisService;

    @RequestMapping("/list")
    public List<?> list() {
        return iTestService.list();
    }



    @GetMapping("testLog")
    public String test() {
        System.out.println("我是System服务");
        log.info("info日志");
        log.error("error日志");
        return  "我是System服务";
    }


    @GetMapping("/redis")
    public String redisAndGet() {
        SysUserInfo sysUserInfo = new SysUserInfo();
        sysUserInfo.setUserAccount("redisTest");
        redisService.setCacheObject("u",sysUserInfo);

        SysUserInfo us = redisService.getCacheObject("u", SysUserInfo.class);
        return us.toString();

    }
}
