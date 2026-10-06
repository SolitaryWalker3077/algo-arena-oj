package com.oj.judge.service;

import com.oj.judge.entity.SandBoxExecuteResult;
import com.oj.judge.service.impl.SandboxServiceImpl;

import java.util.List;

public interface ISandboxService {
    SandBoxExecuteResult exeJavaCode(Long userId, String userCode, List<String> inputList);
}
