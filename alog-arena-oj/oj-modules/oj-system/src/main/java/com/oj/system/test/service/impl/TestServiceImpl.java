package com.oj.system.test.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.system.test.entity.TestInfo;
import com.oj.system.test.mapper.TestMapper;
import com.oj.system.test.service.ITestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TestServiceImpl implements ITestService {

    @Autowired
    private TestMapper testMapper;

    @Override
    public List<TestInfo> list() {
        List<TestInfo> testInfos = testMapper.selectList(new
                LambdaQueryWrapper<>());
        System.out.printf("");
        return testInfos;
    }
}
