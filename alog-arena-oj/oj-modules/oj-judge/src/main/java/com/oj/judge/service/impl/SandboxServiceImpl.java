package com.oj.judge.service.impl;

import com.oj.judge.entity.SandBoxExecuteResult;
import com.oj.judge.service.ISandboxService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SandboxServiceImpl implements ISandboxService {
    @Override
    public SandBoxExecuteResult exeJavaCode(Long userId, String userCode, List<String> inputList) {

    }
}
