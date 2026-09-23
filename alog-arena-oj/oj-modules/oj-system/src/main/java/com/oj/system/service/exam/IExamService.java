package com.oj.system.service.exam;


import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamEditDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.dto.ExamQuestionAddDto;
import com.oj.system.entity.exam.vo.ExamDetailVo;
import com.oj.system.entity.exam.vo.ExamVo;

import java.util.List;

public interface IExamService {

    List<ExamVo> list(ExamQueryDto examQueryDto);

    String add(ExamAddDto examAddDto);

    boolean questionAdd(ExamQuestionAddDto examQuestionAddDto);

    int questionDelete(Long examId, Long questionId);

    ExamDetailVo detail(Long examId);

    int edit(ExamEditDto examEditDto);


    int delete(Long examId);

    int publish(Long examId);

    int cancelPublish(Long examId);
}
