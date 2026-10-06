package com.oj.judge.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.api.entity.UserExeResult;
import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;
import com.oj.common.constants.Constants;
import com.oj.common.constants.JudgeConstants;
import com.oj.common.enums.CodeRunStatus;
import com.oj.judge.entity.SandBoxExecuteResult;
import com.oj.judge.entity.UserSubmit;
import com.oj.judge.mapper.UserSubmitMapper;
import com.oj.judge.service.IJudgeService;
import com.oj.judge.service.ISandboxService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class JudgeServiceImpl implements IJudgeService {

    @Autowired
    private ISandboxService sandboxService;

    @Autowired
    private UserSubmitMapper userSubmitMapper;

    @Override
    public UserQuestionResultVo doJudgeJavaCode(JudgeSubmitDto judgeSubmitDTO) {
        log.info("---- 判题逻辑开始 -------");
        SandBoxExecuteResult sandBoxExecuteResult =
                sandboxService.exeJavaCode(judgeSubmitDTO.getUserId(), judgeSubmitDTO.getUserCode(), judgeSubmitDTO.getInputList());
        UserQuestionResultVo userQuestionResultVo = new UserQuestionResultVo();
        if(sandBoxExecuteResult != null && CodeRunStatus.SUCCEED.equals(sandBoxExecuteResult.getRunStatus())) {
            //对比直接结果 时间限制 空间限制的对比

            //比对直接结果  时间限制  空间限制的比对
            userQuestionResultVo = doJudge(judgeSubmitDTO, sandBoxExecuteResult, userQuestionResultVo);


        } else {
            userQuestionResultVo.setPass(Constants.FALSE);
            if(sandBoxExecuteResult != null) {
                userQuestionResultVo.setExeMessage(sandBoxExecuteResult.getExeMessage());
            } else {
                userQuestionResultVo.setExeMessage(CodeRunStatus.UNKNOWN_FAILED.getMsg());
            }
            userQuestionResultVo.setScore(JudgeConstants.ERROR_SCORE);
        }
        saveUserSubmit(judgeSubmitDTO, userQuestionResultVo);
        log.info("判题逻辑结束，判题结果为： {} ", userQuestionResultVo);
        return userQuestionResultVo;
    }


    private UserQuestionResultVo doJudge(JudgeSubmitDto judgeSubmitDTO,
                                         SandBoxExecuteResult sandBoxExecuteResult,
                                         UserQuestionResultVo userQuestionResultVO) {
        List<String> exeOutputList = sandBoxExecuteResult.getOutputList();
        List<String> outputList = judgeSubmitDTO.getOutputList();
        if (outputList.size() != exeOutputList.size()) {
            userQuestionResultVO.setScore(JudgeConstants.ERROR_SCORE);
            userQuestionResultVO.setPass(Constants.FALSE);
            userQuestionResultVO.setExeMessage(CodeRunStatus.NOT_ALL_PASSED.getMsg());
            return userQuestionResultVO;
        }
        List<UserExeResult> userExeResultList = new ArrayList<>();
        boolean passed = resultCompare(judgeSubmitDTO, exeOutputList, outputList, userExeResultList);
        return assembleUserQuestionResultVO(judgeSubmitDTO, sandBoxExecuteResult, userQuestionResultVO, userExeResultList, passed);
    }


    private boolean resultCompare(JudgeSubmitDto judgeSubmitDTO, List<String> exeOutputList,
                                  List<String> outputList, List<UserExeResult> userExeResultList) {
        boolean passed = true;
        for (int index = 0; index < outputList.size(); index++) {
            String output = outputList.get(index);
            String exeOutPut = exeOutputList.get(index);
            String input = judgeSubmitDTO.getInputList().get(index);
            UserExeResult userExeResult = new UserExeResult();
            userExeResult.setInput(input);
            userExeResult.setOutput(output);
            userExeResult.setExeOutput(exeOutPut);
            userExeResultList.add(userExeResult);
            if (!output.equals(exeOutPut)) {
                passed = false;
                log.info("输入：{}， 期望输出：{}， 实际输出：{} ", input, output, exeOutputList);
            }
        }
        return passed;
    }

    private UserQuestionResultVo assembleUserQuestionResultVO(JudgeSubmitDto judgeSubmitDTO,
                                                              SandBoxExecuteResult sandBoxExecuteResult,
                                                              UserQuestionResultVo userQuestionResultVO,
                                                              List<UserExeResult> userExeResultList, boolean passed) {
        userQuestionResultVO.setUserExeResultList(userExeResultList);
        if (!passed) {
            userQuestionResultVO.setPass(Constants.FALSE);
            userQuestionResultVO.setScore(JudgeConstants.ERROR_SCORE);
            userQuestionResultVO.setExeMessage(CodeRunStatus.NOT_ALL_PASSED.getMsg());
            return userQuestionResultVO;
        }
        if (sandBoxExecuteResult.getUseMemory() > judgeSubmitDTO.getSpaceLimit()) {
            userQuestionResultVO.setPass(Constants.FALSE);
            userQuestionResultVO.setScore(JudgeConstants.ERROR_SCORE);
            userQuestionResultVO.setExeMessage(CodeRunStatus.OUT_OF_MEMORY.getMsg());
            return userQuestionResultVO;
        }
        if (sandBoxExecuteResult.getUseTime() > judgeSubmitDTO.getTimeLimit()) {
            userQuestionResultVO.setPass(Constants.FALSE);
            userQuestionResultVO.setScore(JudgeConstants.ERROR_SCORE);
            userQuestionResultVO.setExeMessage(CodeRunStatus.OUT_OF_TIME.getMsg());
            return userQuestionResultVO;
        }
        userQuestionResultVO.setPass(Constants.TRUE);
        int score = judgeSubmitDTO.getDifficulty() * JudgeConstants.DEFAULT_SCORE;
        userQuestionResultVO.setScore(score);
        return userQuestionResultVO;
    }



    private void saveUserSubmit(JudgeSubmitDto judgeSubmitDTO, UserQuestionResultVo userQuestionResultVo) {
        UserSubmit userSubmit = new UserSubmit();
        BeanUtil.copyProperties(userQuestionResultVo,userSubmit);
        userSubmit.setUserId(judgeSubmitDTO.getUserId());
        userSubmit.setQuestionId(judgeSubmitDTO.getQuestionId());
        userSubmit.setExamId(judgeSubmitDTO.getExamId());
        userSubmit.setProgramType(judgeSubmitDTO.getProgramType());
        userSubmit.setUserCode(judgeSubmitDTO.getUserCode());
        userSubmitMapper.delete(new LambdaQueryWrapper<UserSubmit>()
                .eq(UserSubmit::getUserId, judgeSubmitDTO.getUserId())
                .eq(UserSubmit::getQuestionId, judgeSubmitDTO.getQuestionId())
                .isNull(judgeSubmitDTO.getExamId() == null, UserSubmit::getExamId)
                .eq(judgeSubmitDTO.getExamId() != null, UserSubmit::getExamId, judgeSubmitDTO.getExamId()));
        userSubmitMapper.insert(userSubmit);
    }
}
