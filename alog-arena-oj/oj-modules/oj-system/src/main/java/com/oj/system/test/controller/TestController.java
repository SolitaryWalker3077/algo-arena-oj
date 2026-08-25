package com.oj.system.test.controller;

import com.oj.system.test.service.ITestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/test")
public class TestController {
    @Autowired
    private ITestService iTestService;

    @RequestMapping("/list")
    public List<?> list() {
        return iTestService.list();
    }
}
