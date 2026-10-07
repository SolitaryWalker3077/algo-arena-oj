package com.oj.judge.service;


import com.oj.judge.entity.SandBoxExecuteResult;

import java.util.List;

public interface ISandboxPoolService {
    SandBoxExecuteResult exeJavaCode(Long userId, String userCode, List<String> inputList);
}
