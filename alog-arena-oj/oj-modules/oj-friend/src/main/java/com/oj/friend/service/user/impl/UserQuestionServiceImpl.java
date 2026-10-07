package com.oj.friend.service.user.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.json.JSONUtil;
import com.oj.api.RemoteJudgeService;
import com.oj.common.constants.Constants;
import com.oj.common.entity.Result;
import com.oj.common.enums.ProgramType;
import com.oj.common.enums.ResultCode;
import com.oj.friend.elasticsearch.QuestionRepository;
import com.oj.friend.entity.question.QuestionCase;
import com.oj.friend.entity.question.QuestionInfo;
import com.oj.friend.entity.question.es.QuestionEs;
import com.oj.friend.entity.user.dto.UserSubmitDto;

import com.oj.friend.mapper.question.QuestionMapper;
import com.oj.friend.service.user.IUserQuestionService;
import com.oj.security.expection.ServiceException;
import com.oj.security.utils.ThreadLocalUtil;
import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserQuestionServiceImpl implements IUserQuestionService {


    @Autowired
    private RemoteJudgeService remoteJudgeService;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuestionMapper questionMapper;

    @Override
    public Result<UserQuestionResultVo> submit(UserSubmitDto submitDto) {
        Integer programType = submitDto.getProgramType();
        if (ProgramType.JAVA.getValue().equals(programType)) {
            //按照java逻辑处理
            JudgeSubmitDto judgeSubmitDto = assembleJudgeSubmitDTO(submitDto);
            return remoteJudgeService.doJudgeJavaCode(judgeSubmitDto);

        } else if (ProgramType.CPP.getValue().equals(programType)) {
            //TODO按照C++逻辑处理
        } else if (ProgramType.GO.getValue().equals(programType)){
            //TODO 按照GO语言逻辑处理
        }
        throw new ServiceException(ResultCode.FAILED_NOT_SUPPORT_PROGRAM);
    }

    private JudgeSubmitDto assembleJudgeSubmitDTO(UserSubmitDto submitDto) {
        Long questionId = submitDto.getQuestionId();
        QuestionEs questionEs = questionRepository.findById(questionId).orElse(null);
        JudgeSubmitDto judgeSubmitDto = new JudgeSubmitDto();
        if (questionEs == null || questionEs.getDifficult() == null) {
            QuestionInfo questionInfo = questionMapper.selectById(questionId);
            if (questionInfo == null) {
                throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
            }
            if (questionInfo.getDifficult() == null) {
                throw new ServiceException(ResultCode.FAILED_QUESTION_DIFFICULT_MISSING);
            }
            questionEs = new QuestionEs();
            BeanUtil.copyProperties(questionInfo,questionEs);
            questionRepository.save(questionEs);
        }
        BeanUtil.copyProperties(questionEs, judgeSubmitDto);
        judgeSubmitDto.setDifficult(questionEs.getDifficult());
        judgeSubmitDto.setUserId(ThreadLocalUtil.get(Constants.USER_ID, Long.class));
        judgeSubmitDto.setExamId(submitDto.getExamId());
        judgeSubmitDto.setProgramType(submitDto.getProgramType());
        judgeSubmitDto.setUserCode(codeConnect(submitDto.getUserCode(), questionEs.getMainFac()));
        List<QuestionCase> questionCaseList = JSONUtil.toList(questionEs.getQuestionCase(), QuestionCase.class);
        List<String> inputList = questionCaseList.stream().map(QuestionCase::getInput).toList();
        judgeSubmitDto.setInputList(inputList);
        List<String> outputList = questionCaseList.stream().map(QuestionCase::getOutput).toList();
        judgeSubmitDto.setOutputList(outputList);
        return judgeSubmitDto;
    }

    private String codeConnect(String userCode, String mainFunc) {
        String targetCharacter = "}";
        int targetLastIndex = userCode.lastIndexOf(targetCharacter);
        if (targetLastIndex != -1) {
            return userCode.substring(0, targetLastIndex) + "\n" + mainFunc + "\n" + userCode.substring(targetLastIndex);
        }
        throw new ServiceException(ResultCode.FAILED);
    }
}
